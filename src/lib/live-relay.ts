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
 * - **The relay's own end is announced**: at that lifetime the browser gets
 *   `event: bye` with `reason: max-life` before the stream ends, so the page
 *   reopens at once instead of backing off as if the channel had failed. The
 *   frame is the one `webapi` sends at its own max life (contracts
 *   `event-bye.json`), preceded by a blank line so a half-sent event is closed
 *   first. The rest of the bytes are still piped as they arrive, never parsed.
 * - **The upstream dies with the browser**: `request.signal` aborts it, and the
 *   browser's stream ends with no frame.
 */

export const RELAY_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-store',
} as const;

/** What the browser reads when the relay ends the channel at its own lifetime. */
export const RELAY_END_FRAME = '\n\nevent: bye\ndata: {"reason":"max-life"}\n\n';

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
  /** What the lifetime timer does: abort while opening; end with a `bye` once streaming. */
  let onLifetime = () => controller.abort();
  const abort = () => controller.abort();
  if (browserSignal.aborted) return noChannel();
  browserSignal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => onLifetime(), relayLifetimeMs(deps.maxDurationSeconds, deps.random));
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

  if (!isStream || controller.signal.aborted) {
    release();
    // Drain nothing: the refusal's body is not the browser's business.
    await upstream?.body?.cancel().catch(() => undefined);
    return noChannel();
  }

  const reader = upstream.body!.getReader();
  let ended = false;
  const body = new ReadableStream<Uint8Array>({
    start(stream) {
      // The timer and the listener go when the stream ends, however it ends.
      const finish = (frame: boolean) => {
        if (ended) return;
        ended = true;
        release();
        if (frame) stream.enqueue(new TextEncoder().encode(RELAY_END_FRAME));
        stream.close();
      };
      onLifetime = () => {
        finish(true);
        controller.abort();
      };
      controller.signal.addEventListener('abort', () => finish(false), { once: true });
      void (async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done || ended) break;
            stream.enqueue(value);
          }
          finish(false);
        } catch {
          // Our own abort lands here after `finish`; anything else ends the stream too.
          finish(false);
        }
      })();
    },
    cancel() {
      ended = true;
      release();
      controller.abort();
    },
  });
  return new Response(body, { status: 200, headers: { ...RELAY_HEADERS } });
}
