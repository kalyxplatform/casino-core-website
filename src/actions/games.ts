'use server';

import { redirect } from 'next/navigation';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { readSession } from '@/lib/session';
import { emptyLaunch, type LaunchState } from '@/lib/launch-state';

/**
 * `POST /games/launch` answers refusals as slugs meant for whoever is reading the
 * logs, not as sentences meant for a player, so they are mapped here — the same
 * rule `store.ts` follows.
 *
 * `launch-not-available` is ONE answer for several different "no"s: an unknown
 * game, a switched-off game, a switched-off game provider, a currency that is not
 * active and social, and a player with no enabled account in it. The backend makes
 * them indistinguishable on purpose, so the sentence here must not pretend to know
 * which one happened.
 */
const LAUNCH_ERRORS: Record<string, string> = {
  'launch-not-available': 'That game cannot be opened in this currency right now.',
  'games-not-configured': 'Games are not switched on in this environment yet.',
};

/** The launcher builds a different game for a touch screen; the client tells us which. */
const variantOf = (raw: FormDataEntryValue | null): 'desktop' | 'mobile' | undefined =>
  raw === 'mobile' ? 'mobile' : raw === 'desktop' ? 'desktop' : undefined;

export async function launchAction(
  _previous: LaunchState,
  formData: FormData,
): Promise<LaunchState> {
  const session = await readSession();
  if (!session) redirect('/login');

  const gameCode = String(formData.get('gameCode') ?? '');
  const currencyCode = String(formData.get('currencyCode') ?? '');

  // The API validates both properly; this only keeps an empty picker from
  // spending a round trip to be told so.
  if (!gameCode || !currencyCode) {
    return { ...emptyLaunch, error: 'Pick a game and a currency first.' };
  }

  const launch = await webapi.launchGame(session.token, {
    gameCode,
    currencyCode,
    variant: variantOf(formData.get('variant')),
  });

  // A JWT that has not expired is still refused once its `web_session` row is
  // gone, so a 403 from any route means signed out — never a game problem.
  if (launch.code === ResponderCodes.FORBIDDEN) redirect('/login');

  if (launch.code !== ResponderCodes.SUCCESS || !launch.data) {
    return {
      ...emptyLaunch,
      error:
        LAUNCH_ERRORS[launch.message ?? ''] ??
        'The game could not be opened. Try again shortly.',
    };
  }

  // Deliberately NOT logged: `url` carries a live single-use token for this
  // player's balance, and a log line is the easiest place to leak one.
  return { error: null, url: launch.data.url, gameCode, currencyCode };
}
