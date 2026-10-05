import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fixtures from '@/test-fixtures/assistant';
import answered from '@/test-fixtures/support/turn-stream-answered.json';

// Backend feature 009, T062 — the turn relay's rules (research R23, SEC-M11).
//
// The REAL route, the REAL `turn-relay.ts` and the REAL `openSupportTurn` (the site's
// one API module) run here; only the session cookie and the network are replaced.
// Upstream is `global.fetch`, so everything that would leave this server is observed
// exactly — and so is everything that reaches the browser.

vi.mock('server-only', () => ({}));
let session: { token: string } | null = null;
const clearSession = vi.fn(async () => undefined);
vi.mock('@/lib/session', () => ({
  readSession: async () => session,
  clearSession: () => clearSession(),
}));

const BRAND_KEY = 'brand-key-from-the-server-env';
const WEBAPI = 'https://webapi.test';
const SITE = 'https://site.test';

interface UpstreamCall {
  url: string;
  method?: string;
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
  cache?: RequestCache;
  next?: unknown;
}
let calls: UpstreamCall[] = [];
let answer: () => Response | Promise<Response> = () => new Response(null, { status: 500 });

const frames = (events: { event: string; data: unknown }[]) =>
  events.map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');

const STREAM_TEXT = `: ping\n\n${frames(answered.events)}`;

const sseStream = () =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(STREAM_TEXT));
        controller.close();
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Set-Cookie': 'upstream=1',
        'X-Upstream-Secret': 'never-downstream',
      },
    },
  );

/** An event stream that stays open until it is cancelled. */
const openStream = () =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: delta\ndata: {"text":"a"}\n\n'));
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  );

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
    });

/** What a browser would send — including headers that must never reach `webapi`. */
const browserRequest = (
  overrides: {
    headers?: Record<string, string | null>;
    body?: string;
    signal?: AbortSignal;
  } = {},
) => {
  const headers: Record<string, string> = {
    Origin: SITE,
    'Content-Type': 'application/json',
    Authorization: 'Bearer evil',
    'X-Brand-Key': 'evil',
    Cookie: 'ccore_session=whatever',
    'User-Agent': 'browser',
    Accept: '*/*',
  };
  for (const [name, value] of Object.entries(overrides.headers ?? {})) {
    if (value === null) delete headers[name];
    else headers[name] = value;
  }
  return new Request(`${SITE}/api/support/turn`, {
    method: 'POST',
    headers,
    body: overrides.body ?? JSON.stringify(fixtures.turnRequest),
    signal: overrides.signal,
  });
};

const route = () => import('@/app/api/support/turn/route');

describe('POST /api/support/turn — the relay', () => {
  const consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

  beforeEach(() => {
    vi.resetModules();
    process.env.BRAND_KEY = BRAND_KEY;
    process.env.WEBAPI_BASE_URL = WEBAPI;
    session = { token: 'the-real-session-token' };
    clearSession.mockClear();
    calls = [];
    answer = () => new Response(null, { status: 500 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit & { next?: unknown }) => {
        calls.push({
          url,
          method: init.method,
          headers: { ...(init.headers as Record<string, string>) },
          body: String(init.body),
          signal: init.signal as AbortSignal,
          cache: init.cache,
          next: init.next,
        });
        return answer();
      }),
    );
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      consoleSpies.push(vi.spyOn(console, method).mockImplementation(() => undefined));
    }
  });

  afterEach(() => {
    // Nothing is ever logged: not the message, not the token, not the answer.
    for (const spy of consoleSpies.splice(0)) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    vi.unstubAllGlobals();
  });

  it('the route is dynamic and its function limit is 120 s', async () => {
    const { dynamic, maxDuration } = await route();
    expect(dynamic).toBe('force-dynamic');
    expect(maxDuration).toBe(120);
  });

  it('upstream is POST /support/conversation/turns with EXACTLY four headers this server builds', async () => {
    answer = sseStream;
    const { POST } = await route();
    await POST(browserRequest());
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${WEBAPI}/support/conversation/turns`);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers).toEqual({
      Accept: 'text/event-stream, application/json',
      'Content-Type': 'application/json',
      'X-Brand-Key': BRAND_KEY,
      Authorization: 'Bearer the-real-session-token',
    });
    expect(calls[0].cache).toBe('no-store');
    expect(calls[0].next).toBeUndefined();
    const sent = JSON.stringify(calls[0].headers);
    expect(sent).not.toContain('evil');
    expect(sent).not.toContain('ccore_session');
    expect(sent).not.toContain('browser');
  });

  it('the upstream body is ONLY submission_id and message, whatever the browser sent', async () => {
    answer = sseStream;
    const { POST } = await route();
    await POST(
      browserRequest({
        body: JSON.stringify({
          ...fixtures.turnRequest,
          conversation_id: 9,
          player_id: 7,
          brand_id: 2,
          model: 'x',
        }),
      }),
    );
    expect(JSON.parse(calls[0].body)).toStrictEqual(fixtures.turnRequest);
  });

  it.each([
    ['not JSON', '{'],
    ['not an object', '"text"'],
    ['null', 'null'],
    ['a message that is not a string', JSON.stringify({ submission_id: 'a', message: { $ne: 1 } })],
    ['a submission id that is not a string', JSON.stringify({ submission_id: 1, message: 'm' })],
    ['a body past the relay’s size bound', JSON.stringify({ submission_id: 'a', message: 'm'.repeat(40_000) })],
  ])('a body that is %s ⇒ refused without calling upstream', async (_name, body) => {
    const { POST } = await route();
    const response = await POST(browserRequest({ body }));
    expect(calls).toEqual([]);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toStrictEqual({ code: 400, message: 'request-refused' });
  });

  it('an upstream event stream is piped unparsed with EXACTLY the two relay headers', async () => {
    answer = sseStream;
    const { POST } = await route();
    const response = await POST(browserRequest());
    expect(response.status).toBe(200);
    expect([...response.headers.keys()].sort()).toEqual(['cache-control', 'content-type']);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    expect(response.headers.get('cache-control')).toBe('no-store');
    // Byte for byte, the comment line included: nothing is parsed or rewritten.
    expect(await response.text()).toBe(STREAM_TEXT);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('an upstream JSON refusal is JSON carrying ONLY code and message — no upstream header leaks', async () => {
    answer = json(
      { ...fixtures.supportLimit, data: { internal: 1 }, error: 'x', stack: 'y' },
      200,
      { 'Set-Cookie': 'upstream=1', 'X-Upstream-Secret': 'never-downstream' },
    );
    const { POST } = await route();
    const response = await POST(browserRequest());
    expect(response.status).toBe(200);
    expect([...response.headers.keys()].sort()).toEqual(['cache-control', 'content-type']);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toStrictEqual(fixtures.supportLimit);
  });

  it.each([
    ['support-unavailable', fixtures.supportUnavailable],
    ['support-busy', fixtures.supportBusy],
    ['conversation-closed', fixtures.conversationClosed],
    ['turn-in-progress', fixtures.turnInProgress],
    ['submission-rejected', fixtures.submissionRejected],
    ['assistant-disabled', fixtures.assistantDisabled],
    ['a 400', fixtures.turnInvalid],
  ])('%s passes through as it is', async (_name, fixture) => {
    answer = json(fixture);
    const { POST } = await route();
    const response = await POST(browserRequest());
    expect(await response.json()).toStrictEqual(fixture);
  });

  it('a replay carries data — its five keys and nothing else', async () => {
    answer = json({
      ...fixtures.turnReplaySuccess,
      data: { ...fixtures.turnReplaySuccess.data, conversation_id: 4, usage: { input: 1 } },
    });
    const { POST } = await route();
    const response = await POST(browserRequest());
    expect(await response.json()).toStrictEqual(fixtures.turnReplaySuccess);
  });

  it('an interrupted replay passes through with its empty answer', async () => {
    answer = json(fixtures.turnReplayInterrupted);
    const { POST } = await route();
    expect(await (await POST(browserRequest())).json()).toStrictEqual(fixtures.turnReplayInterrupted);
  });

  it('a webapi without the route (HTTP 404) ⇒ code 404, without the framework’s text', async () => {
    answer = json(fixtures.routeNotFound, 404);
    const { POST } = await route();
    const response = await POST(browserRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ code: 404, message: 'not-found' });
  });

  it('code 403 clears the session and answers { code: 403 }', async () => {
    answer = json({ code: 403, message: 'Unauthorized' });
    const { POST } = await route();
    const response = await POST(browserRequest());
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(await response.json()).toStrictEqual({ code: 403 });
  });

  it.each([
    ['a network failure', () => Promise.reject(new Error('ECONNREFUSED'))],
    ['a body that is not JSON', () => new Response('<html>502</html>', { status: 502 })],
    ['JSON that is not an envelope', json({ hello: 'world' })],
    ['an event stream on a non-200', () => new Response('x', { status: 502, headers: { 'Content-Type': 'text/event-stream' } })],
  ])('%s ⇒ { code: 500, message: support-unavailable }', async (_name, upstream) => {
    answer = upstream as () => Response;
    const { POST } = await route();
    const response = await POST(browserRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual(fixtures.supportUnavailable);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('a missing BRAND_KEY ⇒ support-unavailable, and nothing is sent', async () => {
    delete process.env.BRAND_KEY;
    const { POST } = await route();
    const response = await POST(browserRequest());
    expect(calls).toEqual([]);
    expect(await response.json()).toStrictEqual(fixtures.supportUnavailable);
  });

  it('no session ⇒ { code: 403 } without calling upstream', async () => {
    session = null;
    const { POST } = await route();
    const response = await POST(browserRequest());
    expect(calls).toEqual([]);
    expect(await response.json()).toStrictEqual({ code: 403 });
  });

  describe('SEC-M11: only this site’s own page may post a turn', () => {
    it.each([
      ['another site’s', 'https://evil.test'],
      ['a look-alike host’s', 'https://site.test.evil.test'],
      ['another port’s', 'https://site.test:8443'],
      ['the opaque', 'null'],
      ['an unparseable', 'not a url'],
      ['a missing', null],
    ])('%s Origin ⇒ refused without calling upstream', async (_name, origin) => {
      const { POST } = await route();
      const response = await POST(browserRequest({ headers: { Origin: origin } }));
      expect(calls).toEqual([]);
      expect(response.status).toBe(403);
      expect(await response.json()).toStrictEqual({ code: 400, message: 'request-refused' });
      expect(clearSession).not.toHaveBeenCalled();
    });

    it('the site’s own address is the forwarded host when a proxy names one', async () => {
      answer = sseStream;
      const { POST } = await route();
      const response = await POST(
        browserRequest({ headers: { Origin: 'https://brand.example', 'X-Forwarded-Host': 'brand.example' } }),
      );
      expect(response.status).toBe(200);
      expect(calls).toHaveLength(1);
    });

    it.each([
      ['text/plain', 'text/plain'],
      ['a form', 'application/x-www-form-urlencoded'],
      ['multipart', 'multipart/form-data; boundary=x'],
      ['a look-alike', 'application/jsonp'],
    ])('a Content-Type of %s ⇒ refused without calling upstream', async (_name, type) => {
      const { POST } = await route();
      const response = await POST(browserRequest({ headers: { 'Content-Type': type } }));
      expect(calls).toEqual([]);
      expect(response.status).toBe(415);
      expect(await response.json()).toStrictEqual({ code: 400, message: 'request-refused' });
    });

    it('application/json with a charset is accepted', async () => {
      answer = sseStream;
      const { POST } = await route();
      await POST(browserRequest({ headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
      expect(calls).toHaveLength(1);
    });
  });

  it('the browser aborting ⇒ the upstream AbortController fires', async () => {
    answer = openStream;
    const browser = new AbortController();
    const { POST } = await route();
    await POST(browserRequest({ signal: browser.signal }));
    expect(calls[0].signal.aborted).toBe(false);
    browser.abort();
    expect(calls[0].signal.aborted).toBe(true);
  });

  it('the browser cancelling the stream it reads ⇒ the upstream is aborted too', async () => {
    answer = openStream;
    const { POST } = await route();
    const response = await POST(browserRequest());
    const reader = response.body!.getReader();
    await reader.read();
    expect(calls[0].signal.aborted).toBe(false);
    await reader.cancel();
    expect(calls[0].signal.aborted).toBe(true);
  });
});

describe('proxy.ts', () => {
  it('its matcher does not cover /api/support/turn — the relay answers JSON, never a redirect', async () => {
    vi.resetModules();
    const { config } = await import('@/proxy');
    const covers = (pattern: string, path: string) =>
      new RegExp(`^${pattern.replace(/\/:path\*/g, '(?:/.*)?').replace(/:\w+/g, '[^/]+')}$`).test(path);
    expect(config.matcher.some((pattern) => covers(pattern, '/support/T-000123'))).toBe(true);
    expect(config.matcher.some((pattern) => covers(pattern, '/api/support/turn'))).toBe(false);
  });
});
