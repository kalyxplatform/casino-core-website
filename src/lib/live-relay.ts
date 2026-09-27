/**
 * The rules of `/api/live` (backend feature 006, research R4 / R13), kept apart
 * from the route file so they can be tested without a Next.js request.
 *
 * - **Downstream carries exactly two headers**, `Content-Type: text/event-stream`
 *   and `Cache-Control: no-store` — never the upstream header map (SEC-M14).
 * - **A refusal is "no channel"**: `webapi` refuses with a JSON business answer at
 *   HTTP 200 (`realtime-capacity`, `realtime-unavailable`, `Unauthorized`), and
 *   the browser gets a bodyless 204, which `EventSource` treats as an error. The
 *   page then waits its jitter and tries again (`useLiveChannel`).
 * - **The relay's own life is jittered** (PERF-M11): the upstream is aborted at
 *   `maxDuration × uniform(0.6, 0.95)` seconds, so channels opened together do
 *   not all reconnect together at every platform ceiling, for ever.
 * - **The upstream dies with the browser**: `request.signal` aborts it.
 */

export const RELAY_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-store',
} as const;

/** Milliseconds this relay holds the upstream before ending it itself. */
export const relayLifetimeMs = (maxDurationSeconds: number, random: () => number = Math.random) =>
  Math.floor(maxDurationSeconds * 1000 * (0.6 + 0.35 * random()));

export interface RelayDependencies {
  /** The session token from the httpOnly cookie, or null for an anonymous visitor. */
  token: string | null;
  /** Opens the upstream — `openRealtimeStream` in production. */
  open: (token: string | null, signal: AbortSignal) => Promise<Response | null>;
  maxDurationSeconds: number;
  random?: () => number;
}

const noChannel = () => new Response(null, { status: 204 });

export async function relay(browserSignal: AbortSignal, deps: RelayDependencies): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (browserSignal.aborted) return noChannel();
  browserSignal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, relayLifetimeMs(deps.maxDurationSeconds, deps.random));
  const release = () => {
    clearTimeout(timer);
    browserSignal.removeEventListener('abort', abort);
  };

  const upstream = await deps.open(deps.token, controller.signal);
  const isStream =
    upstream !== null &&
    upstream.status === 200 &&
    (upstream.headers.get('content-type') ?? '').startsWith('text/event-stream') &&
    upstream.body !== null;

  if (!isStream) {
    release();
    // Drain nothing: the refusal's body is not the browser's business.
    await upstream?.body?.cancel().catch(() => undefined);
    return noChannel();
  }

  // The timer and the listener go when the stream ends, however it ends.
  const body = upstream.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      flush: release,
    }),
  );
  controller.signal.addEventListener('abort', release, { once: true });
  return new Response(body, { status: 200, headers: { ...RELAY_HEADERS } });
}
