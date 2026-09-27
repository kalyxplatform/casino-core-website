import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Backend feature 006, T063 — the relay's rules (R4 / R13, SEC-M14, PERF-M11).
//
// The REAL route and the REAL `openRealtimeStream` (the site's one API module) run here;
// only the session cookie and the network are replaced. Upstream is `global.fetch`, so
// every header that would leave this server is observed exactly.

vi.mock('server-only', () => ({}));
let session: { token: string } | null = null;
vi.mock('@/lib/session', () => ({ readSession: async () => session }));

const BRAND_KEY = 'brand-key-from-the-server-env';
const WEBAPI = 'https://webapi.test';

interface UpstreamCall {
  url: string;
  headers: Record<string, string>;
  signal: AbortSignal;
  cache?: RequestCache;
}
let calls: UpstreamCall[] = [];
let answer: () => Response = () => new Response(null, { status: 500 });

const sseStream = () =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: hello\ndata: {}\n\n'));
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Set-Cookie': 'upstream=1',
        'X-Upstream-Secret': 'never-downstream',
        'Content-Encoding': 'identity',
      },
    },
  );

/** What a browser would send — including headers that must never reach `webapi`. */
const browserRequest = (signal?: AbortSignal) =>
  new Request('https://site.test/api/live', {
    headers: {
      Authorization: 'Bearer evil',
      'X-Brand-Key': 'evil',
      Cookie: 'casino_session=whatever',
      'User-Agent': 'browser',
      Accept: 'text/event-stream',
    },
    signal,
  });

async function route() {
  return import('@/app/api/live/route');
}

describe('GET /api/live — the relay', () => {
  const consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

  beforeEach(() => {
    vi.resetModules();
    process.env.BRAND_KEY = BRAND_KEY;
    process.env.WEBAPI_BASE_URL = WEBAPI;
    session = null;
    calls = [];
    answer = () => new Response(null, { status: 500 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({
          url,
          headers: { ...(init.headers as Record<string, string>) },
          signal: init.signal as AbortSignal,
          cache: init.cache,
        });
        return answer();
      }),
    );
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      consoleSpies.push(vi.spyOn(console, method).mockImplementation(() => undefined));
    }
  });

  afterEach(() => {
    // Nothing is ever logged: not the URL, not the token, not the body.
    for (const spy of consoleSpies.splice(0)) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('with a session: upstream gets EXACTLY Accept, X-Brand-Key and Authorization — none of the browser’s headers', async () => {
    session = { token: 'the-real-session-token' };
    answer = sseStream;
    const { GET } = await route();
    await GET(browserRequest());
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${WEBAPI}/realtime/stream`);
    expect(calls[0].headers).toEqual({
      Accept: 'text/event-stream',
      'X-Brand-Key': BRAND_KEY,
      Authorization: 'Bearer the-real-session-token',
    });
    const sent = JSON.stringify(calls[0].headers);
    expect(sent).not.toContain('evil');
    expect(sent).not.toContain('casino_session');
    expect(sent).not.toContain('browser');
    expect(calls[0].cache).toBe('no-store');
  });

  it('without a session: /realtime/feed-stream, with no Authorization at all', async () => {
    answer = sseStream;
    const { GET } = await route();
    await GET(browserRequest());
    expect(calls[0].url).toBe(`${WEBAPI}/realtime/feed-stream`);
    expect(calls[0].headers).toEqual({ Accept: 'text/event-stream', 'X-Brand-Key': BRAND_KEY });
  });

  it.each([
    ['a non-200', () => new Response('nope', { status: 502 })],
    [
      'a JSON business refusal at HTTP 200',
      () =>
        new Response(JSON.stringify({ code: 415, message: 'realtime-capacity' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ],
    ['a network failure', () => Promise.reject(new Error('ECONNREFUSED')) as unknown as Response],
  ])('%s upstream ⇒ 204 with no body', async (_name, upstream) => {
    session = { token: 't' };
    answer = upstream;
    const { GET } = await route();
    const response = await GET(browserRequest());
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('a stream upstream ⇒ HTTP 200 and ONLY Content-Type and Cache-Control downstream', async () => {
    session = { token: 't' };
    answer = sseStream;
    const { GET } = await route();
    const response = await GET(browserRequest());
    expect(response.status).toBe(200);
    expect([...response.headers.keys()].sort()).toEqual(['cache-control', 'content-type']);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const reader = response.body!.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toContain('event: hello');
    await reader.cancel();
  });

  it('the browser aborting ⇒ the upstream AbortController fires', async () => {
    session = { token: 't' };
    answer = sseStream;
    const browser = new AbortController();
    const { GET } = await route();
    await GET(browserRequest(browser.signal));
    expect(calls[0].signal.aborted).toBe(false);
    browser.abort();
    expect(calls[0].signal.aborted).toBe(true);
  });

  it('the relay ends the upstream itself within [0.6, 0.95] × maxDuration (100 samples, PERF-M11)', async () => {
    vi.useFakeTimers();
    session = { token: 't' };
    answer = sseStream;
    const { GET, maxDuration } = await route();
    const lowMs = maxDuration * 1000 * 0.6;
    const highMs = maxDuration * 1000 * 0.95;
    for (let i = 0; i < 100; i++) {
      calls = [];
      await GET(browserRequest());
      const signal = calls[0].signal;
      vi.advanceTimersByTime(lowMs - 1);
      expect(signal.aborted).toBe(false);
      vi.advanceTimersByTime(highMs - lowMs + 1);
      expect(signal.aborted).toBe(true);
      vi.clearAllTimers();
    }
  });

  it('at its own lifetime the relay tells the browser: a bye max-life frame, then the stream ends (SC-001)', async () => {
    vi.useFakeTimers();
    session = { token: 't' };
    answer = sseStream;
    const { GET, maxDuration } = await route();
    const response = await GET(browserRequest());
    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain('event: hello');
    vi.advanceTimersByTime(maxDuration * 1000 * 0.95 + 1);
    expect(calls[0].signal.aborted).toBe(true);
    let rest = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      rest += new TextDecoder().decode(value);
    }
    expect(rest).toMatch(/\n\nevent: bye\ndata: \{"reason":"max-life"\}\n\n$/);
  });

  it('the browser leaving ends the stream WITHOUT a bye frame', async () => {
    session = { token: 't' };
    answer = sseStream;
    const browser = new AbortController();
    const { GET } = await route();
    const response = await GET(browserRequest(browser.signal));
    const reader = response.body!.getReader();
    await reader.read();
    browser.abort();
    let rest = '';
    for (;;) {
      const { done, value } = await reader.read().catch(() => ({ done: true, value: undefined }));
      if (done) break;
      rest += new TextDecoder().decode(value);
    }
    expect(rest).not.toContain('event: bye');
  });
});

describe('proxy.ts', () => {
  it('its matcher does not cover /api/live — the relay decides signed-in vs anonymous itself', async () => {
    vi.resetModules();
    const { config } = await import('@/proxy');
    const covers = (pattern: string, path: string) =>
      new RegExp(`^${pattern.replace(/\/:path\*/g, '(?:/.*)?').replace(/:\w+/g, '[^/]+')}$`).test(path);
    // The translation is not vacuous: it does see the pages the proxy guards.
    expect(config.matcher.some((pattern) => covers(pattern, '/account/profile'))).toBe(true);
    expect(config.matcher.some((pattern) => covers(pattern, '/api/live'))).toBe(false);
  });
});
