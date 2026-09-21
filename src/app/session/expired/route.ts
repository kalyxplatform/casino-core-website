import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/session';

/**
 * The one place a dead session is cleared.
 *
 * A page cannot do this. `cookies()` is mutable only while the request is in its
 * action phase (`areCookiesMutableInCurrentPhase`), so `.delete()` from a render
 * throws `ReadonlyRequestCookiesError` — and once a page has started streaming,
 * HTTP forbids a `Set-Cookie` anyway. Every page that used to call
 * `clearSession()` mid-render redirects here instead.
 *
 * The cookie is dropped on the response object rather than through `cookies()`,
 * which keeps it independent of the request phase entirely.
 *
 * `?expired=1` on the way out is not decoration: without it the login page would
 * have no way to tell "you were signed out" from "you arrived", and the player
 * would be asked to sign in with no explanation for why.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL('/login?expired=1', request.url));
  response.cookies.delete(COOKIE_NAME);
  return response;
}
