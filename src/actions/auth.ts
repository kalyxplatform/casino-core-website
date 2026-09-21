'use server';

import { redirect } from 'next/navigation';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { clearSession, readSession, writeSession } from '@/lib/session';

/** What a form gets back. `null` means "nothing submitted yet". */
export interface FormState {
  error: string | null;
}

/**
 * Turn an envelope into one sentence a player can read.
 *
 * The backend's messages for login and registration are already player-safe and
 * deliberately uniform — every login refusal is the byte-identical "Incorrect
 * credentials", whether the password was wrong, the player is disabled or the
 * attempt was throttled, so that the response discloses nothing. Passing those
 * through is right. What must NOT reach a player is a message from a route that
 * never promised one, so anything unrecognised becomes a generic sentence.
 */
function readableError(response: webapi.ApiResponse<unknown>, fallback: string): string {
  switch (response.code) {
    case ResponderCodes.BAD_REQUEST:
    case ResponderCodes.FORBIDDEN:
    case ResponderCodes.REJECTED:
      return response.message ?? fallback;
    default:
      return fallback;
  }
}

export async function registerAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const countryId = Number(formData.get('countryId'));

  if (!email || !password) return { error: 'Enter an email address and a password.' };
  if (!Number.isInteger(countryId) || countryId < 1) return { error: 'Choose a country.' };

  const registration = await webapi.register({
    email,
    password,
    country_id: countryId,
  });
  if (registration.code !== ResponderCodes.SUCCESS) {
    return { error: readableError(registration, 'Registration could not be completed.') };
  }

  // Registration does not return a session, so sign the new player straight in.
  // A failure here is not a failed registration — the account exists — so it
  // sends them to the login page rather than reporting an error on this form.
  const authentication = await webapi.login({ identifier: email, password });
  if (authentication.code !== ResponderCodes.SUCCESS || !authentication.data) {
    redirect('/login?registered=1');
  }

  await writeSession({
    token: authentication.data.access_token,
    player: authentication.data.user,
  });
  redirect('/account');
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const identifier = String(formData.get('identifier') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!identifier || !password) return { error: 'Enter your email address and password.' };

  const authentication = await webapi.login({ identifier, password });
  if (authentication.code !== ResponderCodes.SUCCESS || !authentication.data) {
    return { error: readableError(authentication, 'Sign in could not be completed.') };
  }

  await writeSession({
    token: authentication.data.access_token,
    player: authentication.data.user,
  });
  redirect('/account');
}

/**
 * Sign out.
 *
 * The cookie is cleared whatever the API says. If the server-side session row
 * could not be ended, the alternative is leaving the player looking signed in
 * on a token they asked to give up — and the token in the cookie is the only
 * copy, so dropping it is the stronger half of the operation.
 */
export async function logoutAction(): Promise<void> {
  const session = await readSession();
  if (session) await webapi.logout(session.token);
  await clearSession();
  redirect('/login');
}
