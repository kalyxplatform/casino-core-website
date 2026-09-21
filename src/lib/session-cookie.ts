/**
 * The session cookie's NAME and SHAPE, with nothing that can only run in one place.
 *
 * This is split out of `session.ts` for one reason: `proxy.ts` has to answer the
 * same question ("is this request signed in?") and cannot import `session.ts`,
 * which reads `cookies()` from `next/headers` — an API the proxy runtime does not
 * have. The proxy gets the cookie from `request.cookies` instead, so the only
 * thing the two need to share is how to judge the value.
 *
 * Sharing it is the point. If the proxy accepted a cookie the pages reject, a
 * player would be let through the gate and then bounced by the page anyway, which
 * is the loop this module exists to make impossible.
 *
 * Deliberately NOT `server-only`: the proxy resolves modules under a different
 * runtime. There is no secret in here — it reads a cookie the browser already
 * holds and cannot read, and it has no `fetch`, no key and no token of its own.
 */

import type { PlayerProfile } from './webapi';

export const COOKIE_NAME = 'ccore_session';

export interface Session {
  token: string;
  player: PlayerProfile;
}

/**
 * The session a cookie value holds, or `null` if it does not hold one.
 *
 * `user_id` is what makes this the CURRENT profile shape, and checking a field of
 * it rather than just its type is deliberate: a cookie written before webapi's
 * fields became `snake_case` still parses as an object, and every field read from
 * it would be `undefined`. Refusing it here signs that player in again instead of
 * rendering a profile full of blanks.
 *
 * A cookie we cannot read is a cookie we do not have — a parse failure is `null`,
 * never a throw, because the caller is a page render or a proxy and neither has
 * anything useful to do with an exception.
 */
export function parseSession(value: string | undefined): Session | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Session | null;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.token === 'string' &&
      typeof parsed.player?.user_id === 'number'
    ) {
      return parsed;
    }
  } catch {
    // Not JSON, so not a session.
  }
  return null;
}
