import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_NAME, parseSession, type Session } from './session-cookie';

/**
 * The player's session, in ONE httpOnly cookie.
 *
 * `httpOnly` is the point: the repo's standing rule is that a token never goes
 * in `localStorage`, because anything that can run script on the page can read
 * it there. Here no browser code can, and the token only ever leaves this
 * server on its way to `webapi`.
 *
 * The profile rides along with the token because the API publishes it exactly
 * once, in the login response: `GET /user` is still a stub that answers a bare
 * string. If that route grows a real body, this cookie should shrink to the
 * token and the profile should be fetched.
 *
 * The cookie's name and the judgement of whether a value is a session live in
 * `session-cookie.ts`, because `proxy.ts` needs both and cannot import this
 * module — see the note there.
 */

export { COOKIE_NAME, parseSession, type Session };

/** The JWT is minted with a 24 h expiry and its `web_session` row expires with it. */
const MAX_AGE_SECONDS = 24 * 60 * 60;

/**
 * Where a page sends a player whose session the API has just refused.
 *
 * It is a Route Handler and not the login page because clearing the cookie is the
 * point of going there, and a page cannot clear one: `cookies()` is mutable only
 * while `requestStore.phase === 'action'`, so `.delete()` from a render throws
 * `ReadonlyRequestCookiesError`. A Route Handler builds its own response and can
 * put `Set-Cookie` on it.
 */
export const EXPIRED_SESSION_PATH = '/session/expired';

export async function readSession(): Promise<Session | null> {
  return parseSession((await cookies()).get(COOKIE_NAME)?.value);
}

/** Only callable from a Server Action or Route Handler — see `cookies()`. */
export async function writeSession(session: Session): Promise<void> {
  (await cookies()).set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    // `next dev` serves plain HTTP, and a `Secure` cookie would simply never be
    // stored there. Deployed, this is always HTTPS.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Drop the cookie.
 *
 * Callable ONLY from a Server Action or a Route Handler. `cookies()` is mutable
 * only while the request is in its action phase, so calling this during a page
 * render throws — which is why a page the API answers `403` for redirects to
 * `EXPIRED_SESSION_PATH` instead of clearing the cookie itself.
 */
export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/**
 * The session, or a redirect to the login page.
 *
 * `proxy.ts` already turned a signed-out request for this page into a redirect
 * before it reached the render, so in practice this does not fire. It stays
 * because the proxy is a gate and not a guarantee — a route added to `app/` and
 * forgotten in the matcher must still refuse to render a player's page without a
 * player — and because it is what gives the rest of the function a `Session`
 * rather than a `Session | null` to work with.
 *
 * A JWT that has not expired is still refused when its `web_session` row is
 * gone — the backend checks the two independently — so holding a cookie is not
 * the same as being signed in. Every page that uses this must still treat a
 * `403` from the API as "signed out": see `redirectToExpiredSession`.
 */
export async function requireSession(): Promise<Session> {
  const session = await readSession();
  if (!session) redirect('/login');
  return session;
}

/**
 * What a page does when the API answers `403` for a cookie we still hold.
 *
 * A JWT that has not expired is still refused once its `web_session` row is gone,
 * so holding a cookie is not being signed in. The cookie has to go, and a render
 * cannot delete it, so this hands the request to the Route Handler that can.
 *
 * This throws (`redirect` always does), so a caller does not need to return.
 */
export function redirectToExpiredSession(): never {
  redirect(EXPIRED_SESSION_PATH);
}
