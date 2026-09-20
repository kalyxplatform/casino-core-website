# CLAUDE.md — Casino Core Website

Player-facing frontend for `casino-core-backend`'s `webapi`. Next.js 16 (App Router),
React 19, Tailwind v4, TypeScript, pnpm. Deployed on Vercel at
<https://casino-core-website.vercel.app/>.

## What this is right now

A **deliberately small, real** player area, rebuilt from scratch on 2026-09-19 after the
previous mock site was deleted. Four things work, end to end, against the live
development API — no mocks, no fabricated data, no static fixtures:

1. **Register / sign in / sign out** — `POST /registration`, `POST /auth/login`, `POST /auth/logout`
2. **Profile and balance** — the login response's `User` block, plus `GET /account/balance`
3. **Buy sweepstake coins** — `GET /store/packages` → `POST /store/checkout` → the sandbox
   payment page → `GET /store/orders/:reference`
4. **Play a game** — `GET /games` → `POST /games/launch` → Revolver Gaming's launcher, in an
   iframe on `/games` (backend feature 004). Both routes are on the backend's
   `feature/004-revolver-game-provider` branch and **`GET /games` is still a hard 404 on the
   development API**, so until that deploys the lobby renders and says the games list could
   not be loaded. `rollout.md` puts this page last on purpose

VIP, promotions, crypto, brand theming and i18n are **gone**. They were mock UI over
invented data. Add them back only against real endpoints — which is how the games page came
back: there is a real catalogue and a real launch behind it now.

## The two facts that shape the whole architecture

### 1. The browser cannot call the API. Ever.

`webapi`'s CORS allowlist **is** the set of brand `WebsiteUrl` origins
(`apps/webapi/src/app.setup.ts`), so this site's origin does pass it. An origin that is no
brand's is answered with no CORS headers at all — never reflected, never `*`.

This app is a **BFF** anyway. Browser → Server Actions / Server Components → `webapi`.
`src/lib/webapi.ts` is the only module that talks to the API, and it is `import 'server-only'`.
There is no client-side `fetch` to the API anywhere.

That is not a style choice now: **`BRAND_KEY` is a credential**, and a browser-side call
would have to carry it. The BFF is what keeps the brand key and the session token on the
server, out of reach of any script on the page.

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
| Launch body | Exactly `{ gameCode, currencyCode, variant? }`. `variant` is `desktop` or `mobile` |
| Launch refusals | `launch-not-available` is ONE answer for unknown game, disabled game, disabled **game provider**, non-social currency and no account in it — never say which |
| `gameProvider` | A game studio. Never a bare `provider` — in this platform that also means a PAYMENT provider, and the two are unrelated |
| Playable currencies | Social only. The balance response does not carry a currency's type, so `GET /currency` supplies it |
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

`CheckoutService` builds that return address from **`brand.WebsiteUrl`**, and refuses the
checkout when it is missing or unusable rather than sending the player somewhere that
cannot bring them back.

Development values (brand `Kalyx Dev`, Id 1):

| Column | Value | Job |
|---|---|---|
| `KeyHash` | sha256 of this site's `BRAND_KEY` | tenancy — matched against `X-Brand-Key` |
| `WebsiteUrl` | `https://casino-core-website.vercel.app` | the return address, and the CORS origin |

`brand.Hostname` used to be the tenancy key. It is **gone** (dropped 2026-09-20): it held the
API's own address, which every brand shares, so it named the platform rather than the brand
and — being UNIQUE — could only ever be held by one brand at a time.

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
    launch-state.ts    # same reason, for the game launch
  actions/
    auth.ts            # register / login / logout
    store.ts           # checkout, order polling
    games.ts           # game launch
  app/
    login/ register/ account/
    store/            # catalogue; starts checkout and navigates to the provider
    store/return/     # where the provider returns the player; polls while pending
    games/            # lobby; launches into an iframe on the same page
  components/          # AppShell, BalancePanel, SubmitButton, Alert
```

## Playing a game

`/games` lists the catalogue and the player's social balances. Pressing **Play** runs
`launchAction`, which calls `POST /games/launch` and gets back a Revolver launcher address;
`GameFrame` puts that address straight into an `<iframe>` over the lobby.

The address is the whole security story:

- **It carries a live single-use game session token** for that player's balance. It is minted
  one click at a time, held in React state, and never written into this site's own URL — a
  query string is the one part of a request that survives into proxy logs and `Referer`
  headers. Never log it, never cache it.
- That is also why the lobby does not link to a `/games/[code]` page that launches on render:
  `<Link>` prefetches, and a prefetch would mint a token for a game nobody opened.
- The "Open in a new tab" fallback carries `rel="noopener noreferrer"` for the same reason —
  without it the token goes to the game host as a `Referer`.

**Framing is Revolver's call, not ours.** Its game host may refuse to be embedded
(`X-Frame-Options`, `frame-ancestors`), and an embedding page cannot tell a blocked frame from
a blank one. The backend's spec assumes a new tab for exactly this reason, so the frame always
offers the tab as a fallback rather than trying to detect the failure.

`exit_url` on the launch address is `brand.WebsiteUrl`, so the game's own exit button
navigates the **frame** back to this site rather than closing it. Use "Close game".

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
| `BRAND_KEY` | **none — required** | Which brand this site is. Sent as `X-Brand-Key`; the API stores only its sha256 |
| `WEBAPI_BASE_URL` | `https://core-webapi-dev.systems.kalyxplatform.com` | The API's address. It selects nothing — every brand shares it |

Neither is `NEXT_PUBLIC_`, deliberately: the browser must never hold either, and `BRAND_KEY`
is a credential. It is a bearer secret, so treat it like a password — never in a URL, never
in a log, never in the repo. Rotate it by setting `brand.PreviousKeyHash` to the current
digest and `KeyHash` to the new one, deploying the new value here, then clearing
`PreviousKeyHash`; both keys work in between, so there is no window where requests fail.

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

- Brand `Kalyx Dev` (Id 1), active, **`WebsiteUrl` = `https://casino-core-website.vercel.app`**
  and **`KeyHash` = sha256 of this site's `BRAND_KEY`**. Its old `Hostname` column is gone
- Brand `Kalyx Dev Web` (Id 2) was added only so this site's origin passed the API's CORS
  allowlist, back when that allowlist read the hostname column. It reads `WebsiteUrl` now,
  and **that row was deleted on 2026-09-20**
- Currencies `GC.` (1), `SC.` (2) social, `USD` (5) fiat — already present
- Store packages `starter-10` ($9.99), `popular-25` ($24.99), `mega-50` ($49.99), all active,
  each with a purchased `GC.` line and a bonus `SC.` line — **added**

The sandbox payment provider is enabled in that environment (`PAYMENT_PROVIDERS=sandbox`,
`ENV=gcp_development`) and takes no real money.
