import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PlayerProfile } from './webapi';

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
 */
const COOKIE_NAME = 'ccore_session';

/** The JWT is minted with a 24 h expiry and its `web_session` row expires with it. */
const MAX_AGE_SECONDS = 24 * 60 * 60;

export interface Session {
  token: string;
  player: PlayerProfile;
}

export async function readSession(): Promise<Session | null> {
  const cookie = (await cookies()).get(COOKIE_NAME);
  if (!cookie) return null;

  try {
    const parsed = JSON.parse(cookie.value) as Session | null;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.token === 'string' &&
      // `user_id` is what makes this the CURRENT profile shape, and checking a
      // field of it rather than just its type is deliberate: a cookie written
      // before webapi's fields became snake_case still parses as an object, and
      // every field read from it would be `undefined`. Refusing it here signs
      // that player in again instead of rendering a profile full of blanks.
      typeof parsed.player?.user_id === 'number'
    ) {
      return parsed;
    }
  } catch {
    // A cookie we cannot read is a cookie we do not have.
  }
  return null;
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

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/**
 * The session, or a redirect to the login page.
 *
 * A JWT that has not expired is still refused when its `web_session` row is
 * gone — the backend checks the two independently — so holding a cookie is not
 * the same as being signed in. Every page that uses this must still treat a
 * `403` from the API as "signed out" (see `requireFreshSession`).
 */
export async function requireSession(): Promise<Session> {
  const session = await readSession();
  if (!session) redirect('/login');
  return session;
}
