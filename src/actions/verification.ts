'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { readSession } from '@/lib/session';
import {
  DECLARATION_ERRORS,
  declarationFrom,
  declarationValues,
  type DeclarationState,
  type DismissState,
} from '@/lib/verification';

/**
 * Backend feature 007 — the player's two verification writes.
 *
 * Neither the declaration nor the standing it answers with is logged, cached or
 * put in an address (SEC-M10): nothing here writes a line, and the answer is not
 * returned to the browser — the page re-reads the standing on the server.
 */

/** `POST /verification/declaration`. */
export async function declareAction(
  _previous: DeclarationState,
  formData: FormData,
): Promise<DeclarationState> {
  const session = await readSession();
  if (!session) redirect('/login');

  // Shown again if refused, so a long form is not lost to one typo. These are the
  // player's own values going back to the player's own browser.
  const values = declarationValues(formData);
  const parsed = declarationFrom(formData);
  if ('error' in parsed) return { error: parsed.error, values };

  const answer = await webapi.declareIdentity(session.token, parsed.declaration);

  if (answer.code === ResponderCodes.SUCCESS) redirect('/verification');

  // A JWT that has not expired is still refused once its `web_session` row is gone.
  if (answer.code === ResponderCodes.FORBIDDEN) redirect('/login');

  if (answer.code === ResponderCodes.NOT_FOUND) {
    return { error: 'Identity checks are not switched on yet. Nothing is required of you.', values };
  }

  // The backend's `400` is ONE message: the failing rule's text, never the value
  // (`declaration.dto.ts`), so it is player-safe as given.
  if (answer.code === ResponderCodes.BAD_REQUEST && answer.message) {
    return { error: answer.message, values };
  }

  return {
    error:
      DECLARATION_ERRORS[answer.message ?? ''] ??
      'Your details could not be recorded. Try again shortly.',
    values,
  };
}

/** `POST /verification/dismissals` — hide one suggestion until the policy's period passes. */
export async function dismissAction(
  _previous: DismissState,
  formData: FormData,
): Promise<DismissState> {
  const session = await readSession();
  if (!session) redirect('/login');

  const rule = String(formData.get('rule') ?? '');
  if (!rule) return { error: 'That suggestion could not be dismissed.', dismissed: false };

  const answer = await webapi.dismissSuggestion(session.token, rule);

  if (answer.code === ResponderCodes.FORBIDDEN) redirect('/login');

  // `415 not-suggesting`: the rule is no longer suggesting (satisfied, or now
  // required). Either way the notice on screen is stale, so re-render it.
  if (answer.code === ResponderCodes.SUCCESS || answer.message === 'not-suggesting') {
    refresh();
    return { error: null, dismissed: true };
  }

  return { error: 'That suggestion could not be dismissed right now.', dismissed: false };
}
