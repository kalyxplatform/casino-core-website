import type { SupportTurnBody } from './webapi';

/**
 * The rules of `POST /api/support/turn` (backend feature 009, research R23),
 * kept apart from the route file so they read as one list.
 *
 * The browser posts one message to this site; this server holds the session
 * token and the brand key and makes the call to `webapi` itself.
 *
 * - **Only this site's own page may post** (SEC-M11). The route is authenticated
 *   by the session cookie alone and a Route Handler has no built-in origin check
 *   (Server Actions do). So a request whose `Origin` is not this site's, or whose
 *   `Content-Type` is not `application/json` — the one type a cross-site form
 *   cannot send — is refused before anything is read or sent. The cookie's
 *   `SameSite=Lax` is the first control (`session.test.ts` pins it); this is the
 *   second.
 * - **Upstream gets a body of two keys**, rebuilt here from the two strings.
 * - **The answer is one of two content types** and each is rebuilt, never
 *   forwarded: an event stream is piped byte for byte, unparsed, under EXACTLY
 *   two headers; a JSON answer is rewritten to `code`, `message` and — for a
 *   replay alone — the five keys of `data`. No upstream header reaches the browser.
 * - **`403` clears the session**, as everywhere: a JWT that has not expired is
 *   still refused once its `web_session` row is gone.
 * - **Anything that is not one of those two answers** (a transport failure, an
 *   unreadable body) is `500 support-unavailable`: the page shows the notice and
 *   the ticket form goes on working.
 * - **The upstream dies with the browser**: `request.signal`, or the browser
 *   cancelling the stream it reads, aborts the call.
 * - **Nothing is logged**: a message is the player's text, an answer is about
 *   their money.
 *
 * Every answer of this relay is JSON the chat reads by `code`, or the stream.
 */

export const TURN_STREAM_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-store',
} as const;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

/**
 * The most this relay reads of a browser's body. A message is at most 2000
 * characters (8 KiB at four bytes each) and a submission id 36; the bound only
 * keeps the relay from buffering whatever it is sent.
 */
export const TURN_BODY_LIMIT_BYTES = 16 * 1024;

export interface TurnRelayDependencies {
  /** The session token from the httpOnly cookie, or null when there is none. */
  token: string | null;
  /** Opens the upstream — `openSupportTurn` in production. */
  open: (token: string, body: SupportTurnBody, signal: AbortSignal) => Promise<Response | null>;
  /** Drops the session cookie — `clearSession` in production. */
  clearSession: () => Promise<void>;
}

const answer = (body: { code: number; message?: string; data?: unknown }, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS } });

/** One refusal for every request this relay will not make, so it says nothing about why. */
const refused = (status: number) => answer({ code: 400, message: 'request-refused' }, status);
const unavailable = () => answer({ code: 500, message: 'support-unavailable' });
const signedOut = () => answer({ code: 403 });

/**
 * Whether the request comes from a page of this site.
 *
 * The site's own host is what the browser was talking to: the forwarded host
 * when a proxy names one (the platform's edge does), else `Host`, else the
 * request's own address — the comparison Server Actions make. A missing `Origin`
 * is refused: every browser sends one on a `fetch` POST, and the chat is the only
 * caller this route has.
 */
function fromThisSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let originHost: string;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    originHost = parsed.host;
  } catch {
    return false;
  }
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  let own = forwarded || request.headers.get('host') || '';
  if (!own) {
    try {
      own = new URL(request.url).host;
    } catch {
      return false;
    }
  }
  return originHost.toLowerCase() === own.toLowerCase();
}

const isJson = (request: Request): boolean =>
  (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase() === 'application/json';

/** The two strings of `turn-request.json`, or null. Their rules are `webapi`'s to judge. */
async function readTurnBody(request: Request): Promise<SupportTurnBody | null> {
  let text: string;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > TURN_BODY_LIMIT_BYTES) return null;
    text = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { submission_id, message } = parsed as Record<string, unknown>;
  if (typeof submission_id !== 'string' || typeof message !== 'string') return null;
  return { submission_id, message };
}

/** A replay's `data`, key for key with `turn-replay-success.json`, or null if it is not one. */
function replayData(data: unknown): Record<string, unknown> | null {
  if (typeof data !== 'object' || data === null) return null;
  const { replayed, turn_no, outcome, answer: text, ticket_reference } = data as Record<string, unknown>;
  if (replayed !== true) return null;
  return { replayed, turn_no, outcome, answer: text, ticket_reference };
}

export async function relayTurn(request: Request, deps: TurnRelayDependencies): Promise<Response> {
  if (!fromThisSite(request)) return refused(403);
  if (!isJson(request)) return refused(415);
  if (!deps.token) return signedOut();

  const body = await readTurnBody(request);
  if (!body) return refused(400);

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (request.signal.aborted) return unavailable();
  request.signal.addEventListener('abort', abort, { once: true });
  const release = () => request.signal.removeEventListener('abort', abort);

  const upstream = await deps.open(deps.token, body, controller.signal);
  if (!upstream) {
    release();
    return unavailable();
  }

  const type = (upstream.headers.get('content-type') ?? '').toLowerCase();

  if (type.startsWith('text/event-stream')) {
    if (upstream.status !== 200 || upstream.body === null) {
      release();
      await upstream.body?.cancel().catch(() => undefined);
      return unavailable();
    }
    const reader = upstream.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(downstream) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            release();
            downstream.close();
            return;
          }
          downstream.enqueue(value);
        } catch {
          // The upstream broke, or our own abort landed: the stream just ends, and
          // a stream that ends with neither `done` nor `error` is "cut off" to the page.
          release();
          downstream.close();
        }
      },
      cancel() {
        release();
        controller.abort();
      },
    });
    return new Response(stream, { status: 200, headers: { ...TURN_STREAM_HEADERS } });
  }

  release();
  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return unavailable();
  }
  if (typeof payload !== 'object' || payload === null) return unavailable();
  const { code, message, data } = payload as Record<string, unknown>;
  if (typeof code !== 'number') return unavailable();

  if (code === 403) {
    await deps.clearSession();
    return signedOut();
  }
  // A `webapi` that has not shipped the route answers the framework's 404, whose
  // message names the route. The page needs the fact, not the text.
  if (code === 404) return answer({ code: 404, message: 'not-found' });

  const out: { code: number; message?: string; data?: unknown } = { code };
  if (typeof message === 'string') out.message = message;
  if (code === 200) {
    const replay = replayData(data);
    // A 200 that is neither a stream nor a replay is not an answer of this route.
    if (!replay) return unavailable();
    out.data = replay;
  }
  return answer(out);
}
