import { clearSession, readSession } from '@/lib/session';
import { openSupportTurn } from '@/lib/webapi';
import { relayTurn } from '@/lib/turn-relay';

/**
 * `POST /api/support/turn` — one turn of the support assistant (backend feature
 * 009, research R23).
 *
 * The chat `fetch`es this route, same origin, with the httpOnly session cookie
 * riding along. This handler reads the cookie on the server and calls `webapi`
 * itself, so the session token and `BRAND_KEY` never leave the server. The rules —
 * who may post, what goes upstream, what comes back — are in `turn-relay.ts`.
 *
 * `proxy.ts` needs no change: its matcher does not cover `/api`, so a signed-out
 * request is answered `{ code: 403 }` here rather than redirected.
 */
export const dynamic = 'force-dynamic';
/**
 * The function's time limit, in seconds. A turn has a hard 45 s wall on `webapi`;
 * 120 is headroom over it. Never below 60. The owner confirms it against the
 * host's real limit before the site is deployed (backend T070).
 */
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  const session = await readSession();
  return relayTurn(request, {
    token: session?.token ?? null,
    open: openSupportTurn,
    clearSession,
  });
}
