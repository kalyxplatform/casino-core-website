# CLAUDE.md — Casino Core Website

Player-facing frontend for `casino-core-backend`'s `webapi`. Next.js 16 (App Router),
React 19, Tailwind v4, TypeScript, pnpm. Deployed on Vercel at
<https://casino-core-website.vercel.app/>.

## What this is right now

A **deliberately small, real** player area, rebuilt from scratch on 2026-09-19 after the
previous mock site was deleted. Seven things work, end to end, against the live
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

5. **Verification (KYC) standing** — backend feature 007: `GET /verification/registration-requirements`
   shapes the sign-up form, `GET /verification` drives a dismissable banner (suggested rules) and
   a blocking panel (required rules) on Profile, Games and Get coins, `/verification` holds the
   declaration form, and Play / Buy refused with `verification-required` show the next step.
   See "Verification" below
6. **Support tickets** — backend feature 008: `/support` opens a ticket (`POST /support/tickets`,
   categories from `GET /support/tickets`) and lists the player's tickets; `/support/[reference]`
   shows the thread (`GET /support/tickets/:reference`) with a reply box
   (`POST …/comments`) and Close (`POST …/close`). See "Support" below
7. **Support assistant** — backend feature 009: the chat above the ticket form on `/support`
   (`GET /support/conversation`, `POST /support/conversation`, `POST …/close`), one message per
   `POST /api/support/turn`, which relays `POST /support/conversation/turns` and its stream.
   See "Support assistant" below

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
There is no client-side `fetch` to the API anywhere. (The chat `fetch`es this site's OWN
`/api/support/turn`, and the live channel opens this site's own `/api/live`; each is a relay
that makes the `webapi` call on the server.)

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

### Every field on this wire is `snake_case`

Since 2026-09-21 the whole `webapi` wire — request bodies AND response bodies — is
`snake_case`: `access_token`, `available_balance`, `game_code`, `package_id`. The
shapes in `src/lib/webapi.ts` mirror the checked-in fixtures key for key so the two
can be diffed by eye. `apps/integrations` did **not** change; that wire is Revolver's.

Two consequences that are easy to miss:

- **A session cookie written before the rename is not readable after it.** It still
  parses as an object, so every field read from it would be `undefined` rather than
  an error. `readSession()` therefore checks for `player.user_id` specifically and
  treats anything else as no session, which signs the player in again instead of
  rendering a profile of blanks.
- **The two repos must deploy in order.** This site speaks only the new spelling, so
  it breaks against a `webapi` that has not shipped the rename — deploy the backend
  first.

Names that did NOT change: `code` / `message` / `data` on the envelope, `variant` on
the launch body, `url` on the launch response, and the `status` slugs themselves.

| Thing | Reality |
|---|---|
| Registration route | `POST /registration`, **not** `/auth/register` |
| Registration body | `{ email, password, country_id }` — `country_id` is **required**, there is no GeoIP fallback. `currency_id` is optional and ignored in social mode, so it is not sent |
| Login body | `{ identifier, password }` — `identifier`, not `email`, and **no `brand_id`** |
| `brand_id` anywhere | **Never send it.** Tenancy is the `X-Brand-Key` header; an unknown property is refused with `code 400` |
| Login response | `{ access_token, user: { user_id, email, country_id, brand_id, status } }` — the id is still `user_id`, not `player_id`: the wire did not follow the `user` → `player` rename |
| `GET /user` | A **stub** that returns a bare string. The profile comes from the login response; that is why it is in the session cookie |
| Balances | **Strings**, `decimal(65,30)`. Never `parseFloat`. See `src/lib/money.ts` |
| Currency codes | `GC.` and `SC.` — with a trailing dot, as the development database actually holds them. The backend's own fixtures disagree (`balance-success.json` says `GC`), so compare codes through `currencyLabel()`, which strips it |
| Checkout body | Exactly `{ package_id }`. A price, a currency or a player in the body is a `400` |
| Launch body | Exactly `{ game_code, currency_code, variant? }`. `variant` kept its spelling — it was never two words — and is `desktop` or `mobile` |
| Launch refusals | `launch-not-available` is ONE answer for unknown game, disabled game, disabled **game provider**, non-social currency and no account in it — never say which |
| `game_provider` | A game studio. Never a bare `provider` — in this platform that also means a PAYMENT provider, and the two are unrelated |
| Playable currencies | Social only. The balance response does not carry a currency's type, so `GET /currency` supplies it |
| Checkout errors | Slugs (`checkout-in-progress`, `too-many-attempts`, `not-found`), mapped to sentences in `src/actions/store.ts` |
| Form field names | `name="packageId"` / `name="gameCode"` in a `<form>` are the FORM's names, not the wire's. The Server Action is the one place that maps them onto the body |

## The purchase flow

Pressing "pay" on the sandbox page does **not** credit anything. It makes the provider send
a signed server-to-server notification to `POST /payments/notifications/sandbox`, and only
that notification credits. The redirect back and the notification **race**, so the return
page reads the ORDER and never infers success from having been redirected to.

The flow is an ordinary full-page round trip:

```
/store  --(POST /store/checkout)-->  redirect_url (OUR payment gateway on the integrations host, since D-058;
                                       it 303s on to the provider's page — the sandbox page, on that same host)
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
    verification.ts    # 007: pure readers of the standing/requirements; strips `declared`
    verification-server.ts # 007: readStanding(), refusalHint() — server-only helpers
    support.ts         # 008: isReference, supportAvailability, form → wire, SUPPORT_ERRORS, states
                       # 009: assistantAvailability, ASSISTANT_ERRORS, OUTCOME_NOTES, the SEC-M7 labels
    turn-relay.ts      # 009: the rules of /api/support/turn (Origin, two keys up, two shapes down)
    turn-events.ts     # 009: the parser of a turn's Server-Sent Events; pure
    live-relay.ts      # 006: the rules of /api/live
  actions/
    auth.ts            # register / login / logout
    store.ts           # checkout, order polling
    games.ts           # game launch
    verification.ts    # 007: declare identity, dismiss a suggestion
    support.ts         # 008: open a ticket, reply, close; 009: open / close the conversation
  app/
    login/ register/ account/
    store/            # catalogue; starts checkout and navigates to the provider
    store/return/     # where the provider returns the player; polls while pending
    games/            # lobby; launches into an iframe on the same page
    verification/     # 007: the player's standing and the declaration form
    support/          # 008: the ticket form and list; [reference]/ is one thread
                      # 009: Chat.tsx, the assistant's chat above the form
    api/live/         # 006: GET, the live channel's relay (EventSource)
    api/support/turn/ # 009: POST, one turn of the assistant — JSON or an event stream
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

## Verification (backend feature 007)

Contracts: `core/casino-core-backend/specs/007-flexible-kyc-policy/contracts/README.md` §1–§7.

- **A `404` or `403` on any `/verification*` read is "nothing required"** (`standingFrom`,
  `requirementsFrom`). The site may deploy before `webapi` serves the routes; the launch and
  checkout gates are the authority either way. Pinned in `src/actions/verification.test.ts`.
- **`POST /registration` is the authority on the declaration.** If the requirements route could
  not be read and the brand does require one, the backend answers `400 declaration is required
  for this brand` and `registerAction` reopens the form with the identity fields.
- **Operator text is text** (backend SEC-M10): `demand_reason`, `rejection_reason` and rule names
  render as React text children. Nothing in `src/` uses `dangerouslySetInnerHTML`; a test scans
  for it.
- **The standing and the declaration are never cached or logged** — every verification call is
  `no-store`, nothing writes a log line — and the standing's `declared` block (the player's legal
  identity) never reaches a client component: pages pass `noticeView(...)`, which drops it.

## Support (backend feature 008)

Contracts: `core/casino-core-backend/specs/008-support-tickets/contracts/README.md`, incl.
"What the website does with each refusal" and "For the website's change" (SEC-M12).

- **Two 404s, told apart by `message`, never by `code`.** HTTP 200 carrying
  `404 ticket-not-found` is the business answer (not this player's ticket → the site's
  not-found page). A `webapi` without the routes answers HTTP STATUS 404 with the framework's
  message, and `request()` keeps only the envelope — so any other `code 404` means "not
  shipped" and renders like `415 support-disabled`: "Support is not available.", no form.
  `supportAvailability()` in `src/lib/support.ts` is the one reader; pinned in
  `src/lib/support.test.ts`.
- **One `submission_id` per form fill** (FR-061). The form mints it in the browser with
  `crypto.randomUUID()` on the first submit and keeps it in a ref; every refusal hands the SAME
  id back, so a double click or a retry is a replay, never a second ticket or reply. Only
  `submission-rejected` (and a reply that landed) gets a new one. It is set on the FormData, not
  rendered into a hidden input: an id minted during render differs between SSR and hydration.
- **The reference from the URL is checked** against `^T-\d{6,15}$` (`isReference`) before it
  reaches a path, and `webapi.ts` `encodeURIComponent`s it anyway.
- **Text is text.** Subjects and messages (the player's and staff's) render as React text
  children with `whitespace-pre-wrap`; no auto-linking, no `dangerouslySetInnerHTML`.
- **Never cached, never logged.** Every support call is `no-store`; nothing writes a line; an
  action never returns the backend's answer whole — a create navigates to the ticket, a reply or
  close calls `refresh()` and the page re-reads.

## Support assistant (backend feature 009)

Contracts: `core/casino-core-backend/specs/009-player-support-assistant/contracts/README.md` § A.
The three recorded streams are copied to `src/test-fixtures/support/`, the JSON shapes to
`src/test-fixtures/assistant.ts`.

- **A turn is a `POST` whose answer is ONE OF TWO content types.** `application/json` is a
  refusal, a `400`, or the REPLAY of a submission seen before (`data.replayed`, the stored
  answer). `text/event-stream` is an admitted turn: `( status | delta | ticket )* ( done | error )`,
  with `: ping` comments anywhere. Branch on `Content-Type`, then on `body.code` or the events.
  It is not `EventSource` (that cannot `POST`): `Chat.tsx` reads the body with a reader and
  `createTurnParser()`. A stream that ends with neither `done` nor `error` was cut off — the
  page re-reads the conversation (`router.refresh()`), it never guesses.
- **The relay rebuilds both directions; it forwards nothing.** Upstream gets exactly four
  headers this server builds and a body of exactly `submission_id` and `message`. Downstream a
  stream is piped byte for byte under exactly `Content-Type` and `Cache-Control: no-store`; a
  JSON answer is rewritten to `code`, `message` and — for a replay only — the five keys of
  `data`. `403` clears the session; a transport failure is `500 support-unavailable`.
- **Only this site's own page may post a turn** (backend SEC-M11). The route is authenticated
  by the cookie alone and a Route Handler has no built-in origin check, so `turn-relay.ts`
  refuses a request whose `Origin` host is not the site's (the forwarded host, else `Host`) or
  whose `Content-Type` is not `application/json`. The cookie's `httpOnly` + `SameSite=Lax` is
  the first control and is pinned in `src/lib/session.test.ts` — do not loosen either.
- **One `submission_id` per message** (FR-096), minted in the browser, kept in a ref WITH the
  text it belongs to, and reused while that text has no answer: after a refusal, and after a
  request lost in transit, sending again is a replay — never a second turn, never a second
  ticket. An admitted turn, a replay and `submission-rejected` spend it.
- **Never cached, never logged, never stored in the browser.** Every call is `no-store`;
  nothing writes a line (the tests fail on any console output); the conversation actions answer
  `{ ok, error }` and the page re-reads.
- **Text is text** (FR-097). The assistant's words, a status label and the player's own message
  are React text children in `whitespace-pre-wrap`; nothing is parsed as markup or auto-linked.
  The one link is to a ticket, built from a reference that passed `isReference`.
- **The labels are not decoration** (backend SEC-M7): the chat's header and every
  `assistant`-authored entry — in the chat AND on a ticket's timeline (`timelineRows` names it
  `Assistant`, never `Support`) — say the answer is automated and not a commitment; one line
  under the input says an AI service processes messages and what not to share.
- **Who sees the chat.** `assistantAvailability()` reads `GET /support/conversation`:
  `415 assistant-disabled`, `415 support-disabled` and any `404` (a `webapi` that has not shipped
  the routes) ⇒ no chat at all, the ticket form as before; any other failure ⇒ a notice above
  the form. The same answers to a TURN are a notice inside the chat (FR-098).
- `maxDuration = 120` on the route is headroom over the backend's hard 45 s turn. It is not yet
  checked against the host's real function limit (backend T070); never set it below 60.

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
pnpm test    # vitest, jsdom; nothing needs the API
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
