import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fixtures from '@/test-fixtures/verification';

// Backend feature 007, PR W — the server side of the site against the contracts.
//
// The REAL `webapi.ts`, the REAL actions and the REAL `verification-server.ts` run
// here; only the cookie, `redirect`/`refresh` and the network are replaced.
// Upstream is `global.fetch`, so every request that would leave this server is
// observed exactly — including that none of it is cached or logged (SEC-M10).

vi.mock('server-only', () => ({}));
let session: { token: string; player: unknown } | null = null;
vi.mock('@/lib/session', () => ({
  readSession: async () => session,
  writeSession: async () => undefined,
  clearSession: async () => undefined,
}));
class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect ${to}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));
const refresh = vi.fn();
vi.mock('next/cache', () => ({ refresh: () => refresh() }));

const BRAND_KEY = 'brand-key-from-the-server-env';
const WEBAPI = 'https://webapi.test';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  cache?: RequestCache;
  next?: unknown;
}
let calls: Call[] = [];
/** Answers by path; HTTP status is part of the answer, as the backend's filter sends it. */
let routes: Record<string, { status?: number; body: unknown }> = {};

const consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

beforeEach(() => {
  vi.resetModules();
  process.env.BRAND_KEY = BRAND_KEY;
  process.env.WEBAPI_BASE_URL = WEBAPI;
  session = { token: 'the-session-token', player: { user_id: 7 } };
  calls = [];
  routes = {};
  refresh.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit & { next?: unknown }) => {
      const path = url.slice(WEBAPI.length);
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: { ...(init.headers as Record<string, string>) },
        body: init.body ? JSON.parse(String(init.body)) : undefined,
        cache: init.cache,
        next: init.next,
      });
      const answer = routes[`${init.method ?? 'GET'} ${path}`] ?? {
        status: 404,
        body: { code: 404, message: `Route ${init.method ?? 'GET'}:${path} not found` },
      };
      return new Response(JSON.stringify(answer.body), {
        status: answer.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    consoleSpies.push(vi.spyOn(console, method).mockImplementation(() => undefined));
  }
});

afterEach(() => {
  // Nothing is ever logged: not the standing, not the declaration, not a refusal.
  for (const spy of consoleSpies.splice(0)) {
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  }
  // And nothing verification-shaped is ever cached.
  for (const call of calls.filter((c) => c.url.includes('/verification'))) {
    expect(call.cache).toBe('no-store');
    expect(call.next).toBeUndefined();
  }
  vi.unstubAllGlobals();
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

const identity = {
  firstName: 'Nino',
  lastName: 'Beridze',
  dateOfBirth: '1990-04-12',
  addressLine1: '12 Rustaveli Avenue',
  addressLine2: '',
  city: 'Tbilisi',
  postalCode: '0108',
  addressCountryId: '1',
  nationalityCountryId: '1',
};

describe('a backend that does not serve the 007 routes yet (404) or refuses them (403)', () => {
  it('GET /verification answering HTTP 404 ⇒ "nothing required"', async () => {
    const { readStanding } = await import('@/lib/verification-server');
    expect(await readStanding('the-session-token')).toEqual({ status: 'clear' });
    expect(calls[0]).toMatchObject({
      url: `${WEBAPI}/verification`,
      headers: { 'X-Brand-Key': BRAND_KEY, Authorization: 'Bearer the-session-token' },
    });
  });

  it('GET /verification answering 403 ⇒ "nothing required"', async () => {
    routes['GET /verification'] = { body: fixtures.unauthorized };
    const { readStanding } = await import('@/lib/verification-server');
    expect(await readStanding('t')).toEqual({ status: 'clear' });
  });

  it.each([
    ['HTTP 404', { status: 404, body: fixtures.routeNotFound }],
    ['403', { body: fixtures.unauthorized }],
  ])('the requirements route answering %s ⇒ the plain sign-up form', async (_name, answer) => {
    routes['GET /verification/registration-requirements'] = answer;
    const webapi = await import('@/lib/webapi');
    const { requirementsFrom, NO_REQUIREMENTS } = await import('@/lib/verification');
    expect(requirementsFrom(await webapi.getRegistrationRequirements())).toEqual(NO_REQUIREMENTS);
    // Public: the brand key alone, no session, no query (a `brand_id` would be a 400).
    expect(calls[0].url).toBe(`${WEBAPI}/verification/registration-requirements`);
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it('a refused Play still shows the next step\'s link when the standing is a 404', async () => {
    routes['POST /games/launch'] = { body: fixtures.verificationRequired };
    const { launchAction } = await import('@/actions/games');
    const { emptyLaunch } = await import('@/lib/launch-state');
    const state = await launchAction(emptyLaunch, form({ gameCode: 'g', currencyCode: 'SC.' }));
    expect(state.error).toBe('This casino needs to verify your identity first.');
    expect(state.verification).toEqual({ nextStep: null });
    expect(state.url).toBeNull();
  });
});

describe('Play and Buy refused with verification-required (contracts §5, §6)', () => {
  it('launch: the sentence, and the next step read from the standing', async () => {
    routes['POST /games/launch'] = { body: fixtures.verificationRequired };
    routes['GET /verification'] = { body: fixtures.standingRequiredGame };
    const { launchAction } = await import('@/actions/games');
    const { emptyLaunch } = await import('@/lib/launch-state');
    const state = await launchAction(emptyLaunch, form({ gameCode: 'g', currencyCode: 'SC.' }));
    expect(state.error).toBe('This casino needs to verify your identity first.');
    expect(state.verification?.nextStep).toMatch(/^Declare your identity/);
  });

  it('checkout: the sentence, and the next step', async () => {
    routes['POST /store/checkout'] = { body: fixtures.verificationRequired };
    routes['GET /verification'] = { body: fixtures.standingDemanded };
    const { checkoutAction } = await import('@/actions/store');
    const { emptyCheckout } = await import('@/lib/checkout-state');
    const state = await checkoutAction(emptyCheckout, form({ packageId: '1' }));
    expect(state.error).toBe('This casino needs to verify your identity first.');
    expect(state.verification?.nextStep).toMatch(/being reviewed/);
    expect(state.redirectUrl).toBeNull();
  });

  it('policy unavailable: a sentence, no hint', async () => {
    routes['POST /store/checkout'] = { body: fixtures.policyUnavailable };
    const { checkoutAction } = await import('@/actions/store');
    const { emptyCheckout } = await import('@/lib/checkout-state');
    const state = await checkoutAction(emptyCheckout, form({ packageId: '1' }));
    expect(state.error).toMatch(/temporarily unavailable/);
    expect(state.verification).toBeNull();
  });
});

describe('registration with a declaration (contracts §7)', () => {
  const initial = { error: null, declarationRequired: false, values: {} };
  const signUp = { email: 'nino@example.com', password: 'Str0ng!Passw0rd', countryId: '1' };

  it('sends EXACTLY registration-declaration-request.json', async () => {
    routes['POST /registration'] = { body: { code: 200, message: 'ok' } };
    routes['POST /auth/login'] = { body: { code: 403, message: 'Incorrect credentials' } };
    const { registerAction } = await import('@/actions/auth');
    await expect(
      registerAction(initial, form({ ...signUp, declare: '1', ...identity })),
    ).rejects.toThrow('redirect /login?registered=1');
    expect(calls[0].body).toEqual(fixtures.registrationDeclarationRequest);
  });

  it('without the fieldset, the body is feature 001\'s — no declaration key at all', async () => {
    routes['POST /registration'] = { body: fixtures.registrationDeclarationMissing };
    const { registerAction } = await import('@/actions/auth');
    const state = await registerAction(initial, form(signUp));
    expect(calls[0].body).toEqual({ email: signUp.email, password: signUp.password, country_id: 1 });
    // The backend said the brand needs one: the form reopens WITH the fields.
    expect(state.declarationRequired).toBe(true);
    expect(state.error).toMatch(/identity details/);
    // The password is never handed back.
    expect(JSON.stringify(state)).not.toContain(signUp.password);
  });

  it('under-age: refused, and the player is told no account exists', async () => {
    routes['POST /registration'] = { body: fixtures.registrationUnderAge };
    const { registerAction } = await import('@/actions/auth');
    const state = await registerAction(initial, form({ ...signUp, declare: '1', ...identity }));
    expect(state.error).toMatch(/no account was created/);
  });
});

describe('the player\'s own writes (contracts §2, §3)', () => {
  it('declaration: sends EXACTLY declaration-request.json and re-renders the page on success', async () => {
    routes['POST /verification/declaration'] = { body: fixtures.standingClear };
    const { declareAction } = await import('@/actions/verification');
    await expect(
      declareAction({ error: null, values: {} }, form(identity)),
    ).rejects.toThrow('redirect /verification');
    expect(calls[0].body).toEqual(fixtures.declarationRequest);
  });

  it('declaration on a backend without the route (404): a sentence, not a crash', async () => {
    const { declareAction } = await import('@/actions/verification');
    const state = await declareAction({ error: null, values: {} }, form(identity));
    expect(state.error).toMatch(/not switched on yet/);
  });

  it('declaration 400: the rule\'s text, as the backend wrote it', async () => {
    routes['POST /verification/declaration'] = {
      body: { code: 400, message: 'date_of_birth must be a calendar date in the form YYYY-MM-DD' },
    };
    const { declareAction } = await import('@/actions/verification');
    const state = await declareAction({ error: null, values: {} }, form(identity));
    expect(state.error).toBe('date_of_birth must be a calendar date in the form YYYY-MM-DD');
  });

  it('dismissal: the body is EXACTLY { rule }, and the page is refreshed', async () => {
    routes['POST /verification/dismissals'] = { body: fixtures.dismissalSuccess };
    const { dismissAction } = await import('@/actions/verification');
    const state = await dismissAction(
      { error: null, dismissed: false },
      form({ rule: 'verify-after-first-bet' }),
    );
    expect(calls[0].body).toEqual({ rule: 'verify-after-first-bet' });
    expect(state).toEqual({ error: null, dismissed: true });
    expect(refresh).toHaveBeenCalledOnce();
  });
});
