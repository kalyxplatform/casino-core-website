import 'server-only';

/**
 * The ONLY place this app talks to `casino-core-backend`'s `webapi`.
 *
 * It runs on the server, never in the browser, and that is not a preference:
 * `webapi`'s CORS allowlist IS the set of brand hostnames
 * (`apps/webapi/src/app.setup.ts`), so a request from this site's own origin is
 * answered with no CORS headers at all. The browser talks to our Server Actions
 * and Server Components; only this module talks to the API.
 *
 * Three conventions from the backend's CLAUDE.md that shape everything below:
 *
 *  1. **The HTTP status is not the outcome.** Business routes are pinned to
 *     `@HttpCode(200)` and answer `{ code, message, data? }`. A wrong password,
 *     an invalid field and an expired session are all HTTP 200. Branch on
 *     `body.code`; a client that branches on `response.status` misses every one.
 *  2. **Every field on this wire is `snake_case`** (backend, 2026-09-21). Request
 *     bodies and response bodies both: `access_token`, `available_balance`,
 *     `game_code`, `package_id`. The shapes below mirror the checked-in fixtures
 *     under `casino-core-backend/specs/<feature>/contracts/` key for key, on
 *     purpose — those fixtures are the authority, and a shape spelled the same as
 *     the fixture can be diffed against it by eye. `apps/integrations` did NOT
 *     change; that wire is Revolver's, not ours.
 *  3. **Tenancy comes from the BRAND KEY.** Every brand's site is served by one
 *     shared `webapi`, so the address says nothing about which brand is calling.
 *     `X-Brand-Key` does: a secret this server holds and the browser never sees.
 *     Nothing here sends a `brand_id`, and sending one would be refused as an
 *     unknown property — the key is the selector, and unlike an id it cannot be
 *     guessed by anyone who wants to act as this brand.
 */

/** `ResponderCodes` as `webapi` numbers them — NOT HTTP statuses, and NOT `integrations`'. */
export const ResponderCodes = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REJECTED: 415,
  NO_BALANCE: 416,
  TRANSACTION_EXISTS: 417,
  INTERNAL_ERROR: 500,
} as const;

/** The envelope every business route answers with. */
export interface ApiResponse<T> {
  code: number;
  message?: string;
  data?: T;
}

export const webapiBaseUrl = (): string =>
  process.env.WEBAPI_BASE_URL ?? 'https://core-webapi-dev.systems.kalyxplatform.com';

/**
 * This brand's key. No default: a wrong or missing key is every request refused,
 * and a silent fallback would make that look like a login problem instead of a
 * configuration one.
 */
const brandKey = (): string | undefined => process.env.BRAND_KEY;

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** The session token, when the route is behind `JwtAuthGuard`. */
  token?: string;
  /**
   * Seconds this answer may be reused for, when it is REFERENCE DATA.
   *
   * Omitting it — which every player-scoped route does — means `no-store`. Only
   * a route whose answer is the same for every player of this brand may set it,
   * because Next's data cache is shared across requests and across regions: a
   * balance or an order cached for one player would be served to the next.
   *
   * The cache is keyed on the request, and every request here carries this
   * deployment's own `X-Brand-Key`, so one brand's cached reference data cannot
   * be handed to another brand's site even if they share a region.
   */
  revalidate?: number;
}

/**
 * One request, and the only place a transport failure becomes an envelope.
 *
 * A DNS failure, a timeout or a 502 from the load balancer is not a business
 * outcome and carries no `code`, so it is mapped to `INTERNAL_ERROR` here —
 * which means every caller has exactly one shape to read, and none of them has
 * to know whether the API was reached.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token, revalidate } = options;

  const key = brandKey();
  if (!key) {
    // Nothing can work without it, so say so once, plainly, on the server. The
    // player sees the same generic message every other outage produces.
    console.error('BRAND_KEY is not set — every API call would be refused.');
    return { code: ResponderCodes.INTERNAL_ERROR, message: 'The service is unreachable.' };
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    // Tenancy. Server-to-server only: this value must never reach the browser.
    'X-Brand-Key': key,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${webapiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // Balances and order status must never be served from a cache, so this is
      // the default and a caller has to ask to opt out of it.
      ...(revalidate === undefined ? { cache: 'no-store' as const } : { next: { revalidate } }),
    });
  } catch {
    // The message is deliberately generic: never show a raw transport error to
    // a player, and never log one with the request body in it.
    return { code: ResponderCodes.INTERNAL_ERROR, message: 'The service is unreachable.' };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { code: ResponderCodes.INTERNAL_ERROR, message: 'The service returned an unreadable response.' };
  }

  // A framework failure (unknown route, malformed JSON) DOES carry a real HTTP
  // status, and the backend's exception filter renames `statusCode` to `code`,
  // so the envelope shape still holds. Anything else is not one of ours.
  if (typeof payload !== 'object' || payload === null || typeof (payload as ApiResponse<T>).code !== 'number') {
    return { code: ResponderCodes.INTERNAL_ERROR, message: 'The service returned an unexpected response.' };
  }

  return payload as ApiResponse<T>;
}

/* ------------------------------------------------------------------ shapes */

/** `specs/001-player-auth-balance/contracts/login-success.json`. */
export interface LoginData {
  access_token: string;
  user: PlayerProfile;
}

/**
 * The player block the login response carries.
 *
 * The wire shape did NOT follow the `user` -> `player` rename: the id is still
 * `user_id` and not `player_id` (D-025). `GET /user` is a stub that returns a
 * bare string, so this login block is the only profile the API publishes today.
 */
export interface PlayerProfile {
  user_id: number;
  email: string;
  country_id: number;
  brand_id: number;
  status: string;
}

/** `contracts/balance-success.json`. Balances are STRINGS — never parse them. */
export interface AccountBalance {
  id: number;
  available_balance: string;
  locked_balance: string;
  currency: { id: number; code: string };
}

/** `specs/002-social-currency-store/contracts/store-packages-success.json`. */
export interface StorePackage {
  id: number;
  code: string;
  tag: string | null;
  price: string;
  price_currency: string;
  items: { currency: string; amount: string; kind: 'purchased' | 'bonus' }[];
}

/** `specs/003-store-purchase-checkout/contracts/checkout-success.json`. */
export interface CheckoutSession {
  reference: string;
  status: string;
  redirect_url: string;
  expires_at: string;
}

/** `contracts/order-credited.json`. */
export interface StoreOrder {
  reference: string;
  status: 'pending' | 'credited' | 'failed' | 'expired' | 'review' | 'refunded' | 'disputed';
  paid_late: boolean;
  package_code: string;
  price: string;
  price_currency: string;
  items: { currency: string; amount: string; kind: 'purchased' | 'bonus' }[];
  created_at: string;
  expires_at: string;
  credited_at: string | null;
}

/**
 * `specs/004-revolver-game-provider/contracts/games-list-success.json`.
 *
 * `game_provider` is a GAME provider — a game studio or aggregator. It is never a
 * bare `provider`: in this platform that word also means a PAYMENT provider, and
 * the two are unrelated.
 */
export interface GameSummary {
  code: string;
  name: string;
  game_provider: string;
}

/**
 * `contracts/games-launch-success.json`.
 *
 * `url` carries a live single-use game session token. It goes to the signed-in
 * player's own browser and nowhere else: never logged, never cached, and never
 * written into an address this app navigates to, because a query string is the
 * one part of a request that ends up in proxy logs and `Referer` headers.
 */
export interface GameLaunch {
  url: string;
}

/** `GET /currency` — public, and in social mode it lists only social currencies. */
export interface CurrencyOption {
  id: number;
  code: string;
  type: string;
  status: string;
}

export interface CountryOption {
  id: number;
  name: string;
  iso_code2: string;
  phone_code: string;
  age_limit: number;
}

/* ------------------------------------------------------------------ routes */

/**
 * `POST /registration`. No `brand_id`, and the DTO is exact: `country_id` is
 * required, and `currency_id` is optional and ignored in social mode, so it is
 * not sent at all rather than sent as null.
 */
export const register = (input: {
  email: string;
  password: string;
  country_id: number;
  /**
   * Backend feature 007, contracts §7: OPTIONAL. Sent only when the form collected
   * it; without it the request is feature 001's byte for byte.
   */
  declaration?: Declaration;
}) => request<never>('/registration', { method: 'POST', body: input });

/** `POST /auth/login`. `identifier`, not `email` — and no `brand_id`. */
export const login = (input: { identifier: string; password: string }) =>
  request<LoginData>('/auth/login', { method: 'POST', body: input });

/** `POST /auth/logout`. Ends only the presented session, not the player's others. */
export const logout = (token: string) =>
  request<never>('/auth/logout', { method: 'POST', token });

export const getBalance = (token: string) =>
  request<AccountBalance[]>('/account/balance', { token });

/**
 * How long reference data may be reused for.
 *
 * Countries and currencies change at the pace of a migration, not a request, so
 * the ceiling on this is not how fast they change — it is how long a BAD answer
 * would persist. Next's data cache keys on the HTTP response, and these routes
 * answer HTTP 200 whatever the envelope says, so an outage that returns
 * `code: 500` is cached exactly like a good answer. Five minutes is the price of
 * that: long enough to take the repeated call off every render, short enough
 * that a lobby which wrongly believes the player has nothing playable heals by
 * itself rather than needing a deploy.
 *
 * This is the same failure the `social` filter in `app/games/page.tsx` is written
 * to survive — a cache serving an answer this app cannot use — and it is worth
 * remembering that adding a cache here is what makes that failure last longer.
 */
const REFERENCE_DATA_TTL_SECONDS = 300;

/** `GET /country`. The same list for every player, so it is cached. */
export const listCountries = () =>
  request<CountryOption[]>('/country', { revalidate: REFERENCE_DATA_TTL_SECONDS });

/**
 * `GET /currency`. Public, but read here for ONE reason: the balance response
 * says which currencies a player holds and not what kind they are, and only a
 * SOCIAL currency can be played in. Intersecting the two is what keeps a fiat
 * account off the lobby's currency picker in a brand that has one.
 *
 * Cached for the same reason as the country list, and it buys less than it looks
 * like it should: the lobby fetches it alongside the games and the balance in one
 * `Promise.all`, so removing it removes a parallel call rather than a round trip.
 * The saving is to the backend, not to the page.
 */
export const listCurrencies = () =>
  request<CurrencyOption[]>('/currency', { revalidate: REFERENCE_DATA_TTL_SECONDS });

/** `GET /games`. Active games of active game providers. An empty list is a success. */
export const listGames = (token: string) =>
  request<{ games: GameSummary[] }>('/games', { token });

/**
 * `POST /games/launch`. The body is EXACTLY `{ game_code, currency_code, variant? }`.
 *
 * The player comes from the session and the brand from the brand key, so a body
 * that named either would be refused as an unknown property — the same rule the
 * checkout body follows. `variant` alone kept its spelling: it was never two words.
 */
export const launchGame = (
  token: string,
  input: { game_code: string; currency_code: string; variant?: 'desktop' | 'mobile' },
) => request<GameLaunch>('/games/launch', { method: 'POST', token, body: input });

export const listPackages = (token: string) =>
  request<StorePackage[]>('/store/packages', { token });

/** `POST /store/checkout`. The body is EXACTLY `{ package_id }` — anything else is a 400. */
export const startCheckout = (token: string, packageId: number) =>
  request<CheckoutSession>('/store/checkout', {
    method: 'POST',
    token,
    body: { package_id: packageId },
  });

export const readOrder = (token: string, reference: string) =>
  request<StoreOrder>(`/store/orders/${encodeURIComponent(reference)}`, { token });

/* ------------------------------------------------------------ verification */

/**
 * Backend feature 007 — a brand's verification (KYC) policy, as the player sees it.
 * Shapes mirror `specs/007-flexible-kyc-policy/contracts/*.json` key for key.
 *
 * Three rules from that feature's security review (SEC-M10) bind everything that
 * reads these:
 *
 *  - `demand_reason`, `rejection_reason` and rule names are OPERATOR-written text.
 *    They are rendered as React text children, never as markup — nothing in this
 *    app uses `dangerouslySetInnerHTML`, and a test pins that.
 *  - The standing and the declaration are never cached: every route below is
 *    `no-store` (no `revalidate`), because both are one player's and Next's data
 *    cache is shared.
 *  - Neither is ever logged, nor put in an address. `request()` logs nothing, and
 *    nothing here adds a line.
 *
 * The standing also carries `declared` — the player's own legal name, date of
 * birth and address. A page reads what it needs from it on the server; it is never
 * handed whole to a client component (`lib/verification.ts`).
 */

/** `contracts/declaration-request.json` — the §2 body, and §7's `declaration`. */
export interface Declaration {
  first_name: string;
  last_name: string;
  /** `YYYY-MM-DD`. */
  date_of_birth: string;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    postal_code: string;
    country_id: number;
  };
  nationality_country_id: number;
}

export type VerificationMode = 'suggested' | 'required';

/** `trigger` of one `asking[]` entry. `amount` is the RULE's threshold — a decimal string, never money. */
export interface VerificationTrigger {
  kind: 'registration' | 'bets' | 'purchases' | 'withdrawal' | 'days' | 'operator' | string;
  count?: number;
  amount?: string;
  currency?: string;
}

export interface VerificationAsking {
  rule: string;
  trigger: VerificationTrigger;
  level: number;
  mode: VerificationMode;
  required_from: string | null;
  dismissed: boolean;
}

export type ActionVerdict = { open: true } | { open: false; reason: string };

/** `contracts/standing-*.json` — §1. */
export interface VerificationStanding {
  level: number;
  state: 'none' | 'declared' | 'submitted' | 'verified' | 'enhanced' | 'rejected' | 'expired';
  next_step: 'declare' | 'submit' | 'wait' | 'none';
  declared: Declaration | null;
  asking: VerificationAsking[];
  actions: { game: ActionVerdict; purchase: ActionVerdict; withdrawal: ActionVerdict };
  rejection_reason: string | null;
  demand_reason: string | null;
}

/** `contracts/registration-requirements-*.json` — §4. */
export interface RegistrationRequirements {
  declaration_required: boolean;
  minimum_age: number;
  /** ISO-2 country code → minimum age, only where it differs from `minimum_age`. */
  country_minimum_age: Record<string, number>;
}

/**
 * `GET /verification/registration-requirements`. PUBLIC: the brand comes from
 * `X-Brand-Key` alone, and no query parameter is sent (a `brand_id` would be a 400).
 *
 * Not cached: it is the same for every visitor of this brand, but an operator's
 * policy change should reach the next sign-up, and a cached 404 from before the
 * backend deployed would outlive the deploy.
 */
export const getRegistrationRequirements = () =>
  request<RegistrationRequirements>('/verification/registration-requirements');

/** `GET /verification` — the signed-in player's standing. Never cached. */
export const getVerification = (token: string) =>
  request<VerificationStanding>('/verification', { token });

/** `POST /verification/declaration`. The body is EXACTLY the declaration. The answer is the new standing. */
export const declareIdentity = (token: string, declaration: Declaration) =>
  request<VerificationStanding>('/verification/declaration', {
    method: 'POST',
    token,
    body: declaration,
  });

/** `POST /verification/dismissals`. The body is EXACTLY `{ rule }`. The answer is the new standing. */
export const dismissSuggestion = (token: string, rule: string) =>
  request<VerificationStanding>('/verification/dismissals', {
    method: 'POST',
    token,
    body: { rule },
  });

/* ----------------------------------------------------------------- support */

/**
 * Backend feature 008 — the player's support tickets. Shapes mirror
 * `specs/008-support-tickets/contracts/*.json` key for key.
 *
 * Every route here is ONE player's, so none of them sets `revalidate`: all are
 * `no-store`, and Next's shared data cache never holds a ticket. Ticket text is
 * player- and staff-written; it is never logged (nothing here writes a line),
 * never put in an address, and rendered as React text children only.
 *
 * The reference goes into a path, so it is `encodeURIComponent`-ed here even
 * though every caller has already checked it against `isReference` (SEC-M12):
 * this module must not trust that it has.
 *
 * Two different 404s (contracts README): HTTP 200 carrying `404 ticket-not-found`
 * is the business answer; a `webapi` without these routes answers HTTP STATUS 404
 * with the framework's message. `request()` keeps only the envelope, so they are
 * told apart by `message` — `supportAvailability` in `lib/support.ts`.
 */

export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_player' | 'resolved' | 'closed';

/** One row of `ticket-list-success.json`'s `tickets`. */
export interface SupportTicket {
  reference: string;
  subject: string;
  category: string;
  status: SupportTicketStatus;
  created_at: string;
  updated_at: string;
}

/** `ticket-list-success.json`'s `data`: the brand's categories (policy order) and the tickets, newest first. */
export interface SupportTicketList {
  categories: string[];
  tickets: SupportTicket[];
}

/** One entry of `ticket-read-success.json`'s `timeline`. */
export interface SupportTimelineEntry {
  kind: 'comment' | 'status';
  author: 'player' | 'staff' | 'assistant' | 'system';
  /** A string for a `comment`, `null` for a `status`. */
  message: string | null;
  /** `{ from, to }` for a `status`, `null` for a `comment`. */
  status: { from: SupportTicketStatus; to: SupportTicketStatus } | null;
  created_at: string;
}

/** `ticket-read-success.json`'s `data`. The timeline is oldest first, at most 200 entries. */
export interface SupportTicketDetail extends SupportTicket {
  can_reply: boolean;
  timeline_truncated: boolean;
  timeline: SupportTimelineEntry[];
}

/** `ticket-create-request.json`, exactly. */
export interface CreateSupportTicketBody {
  submission_id: string;
  category: string;
  subject: string;
  message: string;
}

/** `ticket-comment-request.json`, exactly. */
export interface SupportReplyBody {
  submission_id: string;
  message: string;
}

const ticketPath = (reference: string) => `/support/tickets/${encodeURIComponent(reference)}`;

/** `GET /support/tickets`. No query string — any query key is a `400`. */
export const listSupportTickets = (token: string) =>
  request<SupportTicketList>('/support/tickets', { token });

/** `POST /support/tickets`. The body is EXACTLY the four keys; the answer is `{ reference }`. */
export const createSupportTicket = (token: string, body: CreateSupportTicketBody) =>
  request<{ reference: string }>('/support/tickets', { method: 'POST', token, body });

/** `GET /support/tickets/:reference`. */
export const readSupportTicket = (token: string, reference: string) =>
  request<SupportTicketDetail>(ticketPath(reference), { token });

/** `POST /support/tickets/:reference/comments`. The body is EXACTLY `{ submission_id, message }`. */
export const replyToSupportTicket = (token: string, reference: string, body: SupportReplyBody) =>
  request<{ reference: string }>(`${ticketPath(reference)}/comments`, {
    method: 'POST',
    token,
    body,
  });

/** `POST /support/tickets/:reference/close`. NO body — a body is a `400`. */
export const closeSupportTicket = (token: string, reference: string) =>
  request<{ reference: string }>(`${ticketPath(reference)}/close`, { method: 'POST', token });

/* ---------------------------------------------------------------- realtime */

/**
 * Backend feature 006 — open `webapi`'s live stream, server to server.
 *
 * `GET /realtime/stream` with the session token, or `GET /realtime/feed-stream`
 * with the brand key alone when there is no session (the anonymous feed; the
 * backend adds that route with its US2). The request carries EXACTLY three
 * headers this server constructs — `Accept`, `X-Brand-Key` and, for a player,
 * `Authorization` — and none of the browser's: a browser must not be able to
 * smuggle its own credential into a server-to-server call (security review
 * SEC-M14). Nothing here logs the address or a body.
 *
 * Returns the upstream `Response` for the relay to pipe, or `null` for a
 * transport failure or a missing brand key. A refusal is NOT a transport
 * failure: `webapi` answers it as JSON at HTTP 200, and the relay tells the two
 * apart by `Content-Type`.
 */
export async function openRealtimeStream(
  token: string | null,
  signal: AbortSignal,
): Promise<Response | null> {
  const key = brandKey();
  if (!key) return null;
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    'X-Brand-Key': key,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(
      `${webapiBaseUrl()}${token ? '/realtime/stream' : '/realtime/feed-stream'}`,
      { headers, cache: 'no-store', signal },
    );
  } catch {
    return null;
  }
}
