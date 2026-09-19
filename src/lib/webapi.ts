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
 * Two conventions from the backend's CLAUDE.md that shape everything below:
 *
 *  1. **The HTTP status is not the outcome.** Business routes are pinned to
 *     `@HttpCode(200)` and answer `{ code, message, data? }`. A wrong password,
 *     an invalid field and an expired session are all HTTP 200. Branch on
 *     `body.code`; a client that branches on `response.status` misses every one.
 *  2. **Tenancy comes from the hostname.** The brand is resolved from the raw
 *     `Host` header this request arrives on, so the base URL is not merely an
 *     address — it selects the brand. Nothing here sends a `brandId`, and
 *     sending one would be refused as an unknown property.
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

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** The session token, when the route is behind `JwtAuthGuard`. */
  token?: string;
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
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${webapiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // Balances and order status must never be served from a cache.
      cache: 'no-store',
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
  AccessToken: string;
  User: PlayerProfile;
}

/**
 * The player block the login response carries.
 *
 * The wire shape did NOT follow the `user` -> `player` rename: this is still
 * `UserId` (D-025), and `GET /user` is a stub that returns a bare string, so
 * this login block is the only profile the API publishes today.
 */
export interface PlayerProfile {
  UserId: number;
  Email: string;
  CountryId: number;
  BrandId: number;
  Status: string;
}

/** `contracts/balance-success.json`. Balances are STRINGS — never parse them. */
export interface AccountBalance {
  Id: number;
  AvailableBalance: string;
  LockedBalance: string;
  Currency: { Id: number; Code: string };
}

/** `specs/002-social-currency-store/contracts/store-packages-success.json`. */
export interface StorePackage {
  Id: number;
  Code: string;
  Tag: string | null;
  Price: string;
  PriceCurrency: string;
  Items: { Currency: string; Amount: string; Kind: 'purchased' | 'bonus' }[];
}

/** `specs/003-store-purchase-checkout/contracts/checkout-success.json`. */
export interface CheckoutSession {
  Reference: string;
  Status: string;
  RedirectUrl: string;
  ExpiresAt: string;
}

/** `contracts/order-credited.json`. */
export interface StoreOrder {
  Reference: string;
  Status: 'pending' | 'credited' | 'failed' | 'expired' | 'review' | 'refunded' | 'disputed';
  PaidLate: boolean;
  PackageCode: string;
  Price: string;
  PriceCurrency: string;
  Items: { Currency: string; Amount: string; Kind: 'purchased' | 'bonus' }[];
  CreatedAt: string;
  ExpiresAt: string;
  CreditedAt: string | null;
}

export interface CountryOption {
  Id: number;
  Name: string;
  IsoCode2: string;
  PhoneCode: string;
  AgeLimit: number;
}

/* ------------------------------------------------------------------ routes */

/** `POST /registration`. No `brandId` and no `Email`-cased variants: the DTO is exact. */
export const register = (input: { Email: string; Password: string; countryId: number }) =>
  request<never>('/registration', { method: 'POST', body: input });

/** `POST /auth/login`. Capitalised `Identifier`/`Password`, and no `brandId`. */
export const login = (input: { Identifier: string; Password: string }) =>
  request<LoginData>('/auth/login', { method: 'POST', body: input });

/** `POST /auth/logout`. Ends only the presented session, not the player's others. */
export const logout = (token: string) =>
  request<never>('/auth/logout', { method: 'POST', token });

export const getBalance = (token: string) =>
  request<AccountBalance[]>('/account/balance', { token });

export const listCountries = () => request<CountryOption[]>('/country');

export const listPackages = (token: string) =>
  request<StorePackage[]>('/store/packages', { token });

/** `POST /store/checkout`. The body is EXACTLY `{ packageId }` — anything else is a 400. */
export const startCheckout = (token: string, packageId: number) =>
  request<CheckoutSession>('/store/checkout', { method: 'POST', token, body: { packageId } });

export const readOrder = (token: string, reference: string) =>
  request<StoreOrder>(`/store/orders/${encodeURIComponent(reference)}`, { token });
