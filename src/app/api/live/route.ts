import { readSession } from '@/lib/session';
import { openRealtimeStream } from '@/lib/webapi';
import { relay } from '@/lib/live-relay';

/**
 * `GET /api/live` — the browser's live channel (backend feature 006, R4 / R13).
 *
 * The browser holds `new EventSource('/api/live')`: same origin, the httpOnly
 * session cookie rides along, nothing new is sent. This handler reads the cookie
 * on the server and holds the upstream stream on `webapi` itself, so the session
 * token and `BRAND_KEY` never leave the server — the site's standing rule, kept
 * for the live path too. The bytes are piped as they arrive; nothing is parsed.
 *
 * `proxy.ts` needs no change: its matcher does not cover `/api`, so this route is
 * reached signed in and signed out alike, and decides which upstream to open.
 */
export const dynamic = 'force-dynamic';
/**
 * The platform's function ceiling for this route, in seconds. 300 until rollout
 * reads the plan's real ceiling (backend T070); the relay ends the upstream
 * itself at 60–95 % of it.
 */
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const session = await readSession();
  return relay(request.signal, {
    token: session?.token ?? null,
    open: openRealtimeStream,
    maxDurationSeconds: maxDuration,
  });
}
