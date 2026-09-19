# CLAUDE.md — Casino Core Website

Player-facing frontend for `casino-core-backend`'s `webapi`. Next.js 16 (App Router),
React 19, Tailwind v4, TypeScript, pnpm. Deployed on Vercel at
<https://casino-core-website.vercel.app/>.

## What this is right now

A **deliberately small, real** player area, rebuilt from scratch on 2026-09-19 after the
previous mock site was deleted. Three things work, end to end, against the live
development API — no mocks, no fabricated data, no static fixtures:

1. **Register / sign in / sign out** — `POST /registration`, `POST /auth/login`, `POST /auth/logout`
2. **Profile and balance** — the login response's `User` block, plus `GET /account/balance`
3. **Buy sweepstake coins** — `GET /store/packages` → `POST /store/checkout` → the sandbox
   payment page → `GET /store/orders/:reference`

Games, VIP, promotions, crypto, brand theming and i18n are **gone**. They were mock UI over
invented data. Add them back only against real endpoints.

## The two facts that shape the whole architecture

### 1. The browser cannot call the API. Ever.

`webapi`'s CORS allowlist **is** the set of brand hostnames
(`apps/webapi/src/app.setup.ts`). A request from this site's origin is answered with no CORS
headers at all — never reflected, never `*`. Verified: an `OPTIONS` preflight from
`https://casino-core-website.vercel.app` returns 404.

So this app is a **BFF**. Browser → Server Actions / Server Components → `webapi`.
`src/lib/webapi.ts` is the only module that talks to the API, and it is `import 'server-only'`.
There is no client-side `fetch` to the API anywhere.

Since 2026-09-19 a second brand row carries `Hostname = casino-core-website.vercel.app`
purely so that this origin passes CORS, so a browser-side call would now be *allowed*. The
BFF stays anyway: it is what keeps the session token in an httpOnly cookie, out of reach of
any script on the page.

This is also why the session token lives in an **httpOnly cookie** (`src/lib/session.ts`)
rather than `localStorage` — nothing in the browser can read it.

### 2. The HTTP status is not the outcome.

Business routes are pinned to `@HttpCode(200)` and answer `{ code, message, data? }`. A wrong
password, an invalid field and an expired session are **all HTTP 200**. Branch on `body.code`
(`ResponderCodes` in `src/lib/webapi.ts`), never on `response.status`.

`webapi`'s codes are not `integrations`' codes and are not HTTP statuses, despite looking like
them: `403` FORBIDDEN, `415` REJECTED, `416` NOBALANCE.

## Contracts that bite

These are checked in at `core/casino-core-backend/specs/*/contracts/` and pinned by contract
tests. Read them before changing a request shape.

| Thing | Reality |
|---|---|
| Registration route | `POST /registration`, **not** `/auth/register` |
| Registration body | `{ Email, Password, countryId }` — `countryId` is **required**, there is no GeoIP fallback |
| Login body | `{ Identifier, Password }` — capitalised, and **no `brandId`** |
| `brandId` anywhere | **Never send it.** Tenancy is resolved from the request `Host`; an unknown property is refused with `code 400` |
| Login response | `{ AccessToken, User: { UserId, Email, CountryId, BrandId, Status } }` — still `UserId`, the wire shape did not follow the `user` → `player` rename |
| `GET /user` | A **stub** that returns a bare string. The profile comes from the login response; that is why it is in the session cookie |
| Balances | **Strings**, `decimal(65,30)`. Never `parseFloat`. See `src/lib/money.ts` |
| Currency codes | `GC.` and `SC.` — with a trailing dot |
| Checkout body | Exactly `{ packageId }`. A price, a currency or a player in the body is a `400` |
| Checkout errors | Slugs (`checkout-in-progress`, `too-many-attempts`, `not-found`), mapped to sentences in `src/actions/store.ts` |

## The purchase flow

Pressing "pay" on the sandbox page does **not** credit anything. It makes the provider send
a signed server-to-server notification to `POST /payments/notifications/sandbox`, and only
that notification credits. The redirect back and the notification **race**, so the return
page reads the ORDER and never infers success from having been redirected to.

The flow is an ordinary full-page round trip:

```
/store  --(POST /store/checkout)-->  RedirectUrl (sandbox page, on the API host)
        --(player pays)-->           /store/return?ref=…  (back here)
```

`CheckoutService` builds that return address from **`brand.WebsiteUrl`**, falling back to
`https://<brand.Hostname>` when it is unset. That column exists because the two are not the
same host here: `Hostname` is the tenancy key and must resolve to the **API**, while the
return address must resolve to the **site**. Before it existed, every purchase dumped the
player on the API's 404.

Development values (brand `Kalyx Dev`, Id 1):

| Column | Value | Job |
|---|---|---|
| `Hostname` | `core-webapi-dev.systems.kalyxplatform.com` | tenancy — matched against the API request's `Host` |
| `WebsiteUrl` | `https://casino-core-website.vercel.app` | where a payment provider returns the player |

If the order is still `pending` when the player lands, `OrderPoller` waits for the
notification rather than guessing.

## Layout

```
src/
  lib/
    webapi.ts          # server-only API client; the ONLY thing that calls webapi
    session.ts         # httpOnly session cookie, requireSession()
    money.ts           # decimal-string formatting; no arithmetic, ever
    checkout-state.ts  # shared with the action — see the 'use server' gotcha below
  actions/
    auth.ts            # register / login / logout
    store.ts           # checkout, order polling
  app/
    login/ register/ account/
    store/            # catalogue; starts checkout and navigates to the provider
    store/return/     # where the provider returns the player; polls while pending
  components/          # AppShell, BalancePanel, SubmitButton, Alert
```

## Gotchas

- **A `'use server'` module may export only async functions.** Exporting a constant from one
  throws at module evaluation — and `next build` does **not** catch it for a dynamic page, so
  the build passes and the page 500s. That is why `emptyCheckout` lives in
  `src/lib/checkout-state.ts`. Exercise every page, don't just build.
- **Next.js 16**: `cookies()`, `headers()`, `params` and `searchParams` are all async. Turbopack
  is the default. `middleware` is now `proxy`. Read `node_modules/next/dist/docs/` — it ships
  with the version actually installed.
- **A JWT that has not expired can still be refused.** The token and its `web_session` row are
  checked independently, so logout on another device invalidates it. Treat `403` from any route
  as signed-out: clear the cookie and redirect. `account` and `store` pages already do.
- **`BrandStatus.MAINTAINANCE`** — the typo is intentional in the backend enum.
- Money is never computed here. Display only; the server is the source of truth.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `WEBAPI_BASE_URL` | `https://core-webapi-dev.systems.kalyxplatform.com` | The API, **and** the brand — the `Host` selects the tenant |

It is deliberately **not** `NEXT_PUBLIC_`: the browser must never hold it. The default is the
development API, so no Vercel env var is needed to run.

## Commands

```bash
pnpm dev     # localhost:3000
pnpm build
pnpm lint
```

## Deployment

`vercel.json` sets `git.deploymentEnabled: false`; a push to `master` builds and promotes
through `.github/workflows/vercel-promote.yaml` (needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`).

## Development environment state

Seeded by hand on 2026-09-19 against the `development-531507` Cloud SQL instance, through the
IAP tunnel on `cloudsql-jumpbox`:

- Brand `Kalyx Dev` (Id 1), hostname `core-webapi-dev.systems.kalyxplatform.com`, active —
  was already present; **`WebsiteUrl` set to `https://casino-core-website.vercel.app`**
- Brand `Kalyx Dev Web` (Id 2), hostname `casino-core-website.vercel.app`, active —
  **added**, and it exists ONLY so this site's origin passes the API's CORS allowlist.
  Nothing ever resolves to it: no request reaches the API on that host. It has no players,
  terms or packages, and it is not a tenant in any meaningful sense
- Currencies `GC.` (1), `SC.` (2) social, `USD` (5) fiat — already present
- Store packages `starter-10` ($9.99), `popular-25` ($24.99), `mega-50` ($49.99), all active,
  each with a purchased `GC.` line and a bonus `SC.` line — **added**

The sandbox payment provider is enabled in that environment (`PAYMENT_PROVIDERS=sandbox`,
`ENV=gcp_development`) and takes no real money.
