import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, parseSession } from '@/lib/session-cookie';

/**
 * The auth-state gate: it decides which pages a request is allowed to render,
 * before anything renders.
 *
 * ## Why this exists at all
 *
 * It is not a second security layer — the API is the only thing that decides
 * whether a token is good, and this cannot tell a live session from a dead one.
 * It exists because of what `loading.tsx` does to `redirect()`.
 *
 * A dynamic route with a `loading.tsx` starts streaming its shell immediately.
 * That is the whole point: it is what makes the route prefetchable, and it is what
 * took a click from ~250 ms of nothing to an instant paint. But a response that has
 * begun streaming has already sent its status line, so a `redirect()` from the page
 * body can no longer be an HTTP 307 — Next falls back to
 * `<meta http-equiv="refresh" content="1;url=…">`, and a signed-out player hitting
 * `/account` sat on a skeleton for a full second before moving.
 *
 * Deciding here fixes that at the cause: no shell has been flushed yet, so the
 * answer is a real 307. On Vercel it is also strictly faster than what it replaces
 * — the proxy runs at the edge PoP the player is already talking to (`fra1`),
 * so a redirect no longer crosses to the function region in `iad1` and back.
 *
 * ## What it does NOT do
 *
 * It reads the cookie's shape and nothing else. A cookie whose `web_session` row
 * is gone looks exactly like a live one from here, so every page still has to treat
 * a `403` from the API as signed-out (`redirectToExpiredSession`). Being let through
 * this gate means "you have something that looks like a session", never "you are
 * signed in".
 */

/** Pages that are the player's own: without a session there is nothing to render. */
const SIGNED_IN_ONLY = ['/account', '/store', '/games'];

/** Pages that only make sense signed OUT — offering them to a player is a dead end. */
const SIGNED_OUT_ONLY = ['/login', '/register'];

const covers = (paths: string[], pathname: string): boolean =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const signedIn = parseSession(request.cookies.get(COOKIE_NAME)?.value) !== null;

  if (!signedIn && covers(SIGNED_IN_ONLY, pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (signedIn && covers(SIGNED_OUT_ONLY, pathname)) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  return NextResponse.next();
}

/**
 * Only the pages whose auth state is decidable from a cookie.
 *
 * `/session/expired` is deliberately absent: it is the one route a player with a
 * REFUSED-but-well-formed cookie has to be able to reach, and a gate that read the
 * cookie as "signed in" would send them to `/account`, which would refuse them
 * again — a loop, and the cookie would never get cleared.
 *
 * `/` is absent too. It has no `loading.tsx`, so its `redirect()` is still a clean
 * 307 on its own, and it is the one page that has to look at the cookie to know
 * which way to send the player.
 */
export const config = {
  matcher: ['/account/:path*', '/store/:path*', '/games/:path*', '/login', '/register'],
};
