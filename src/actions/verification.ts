'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { readSession } from '@/lib/session';
import {
  DECLARATION_ERRORS,
  NO_PROVIDER_REFUSALS,
  NO_VERIFICATION_PROVIDER,
  START_VERIFICATION_ERRORS,
  START_VERIFICATION_FAILED,
  declarationFrom,
  declarationValues,
  handoffAddress,
  type DeclarationState,
  type DismissState,
  type StartVerificationState,
} from '@/lib/verification';

/**
 * Backend feature 007 — the player's two verification writes; and 015's start.
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

/**
 * Backend feature 015 — "Verify now" and "Continue verification":
 * `POST /verification/sessions` (contracts §2), then a full-page navigation to the
 * `redirect_url` it answers — the platform's hand-off, which sends the player on
 * to the verification provider. A start while a session is open answers THAT
 * session (`already_started: true`), so resuming is the same call.
 *
 * The answer is followed, never returned to the browser, logged or stored: the
 * reference and the address are in the redirect alone (SEC-M6). It reads
 * nothing from the form: the body is `{}`, so `useActionState`'s two arguments
 * are not declared.
 */
export async function startVerificationAction(): Promise<StartVerificationState> {
  const session = await readSession();
  if (!session) redirect('/login');

  const answer = await webapi.startVerificationSession(session.token);

  if (answer.code === ResponderCodes.FORBIDDEN) redirect('/login');

  if (answer.code === ResponderCodes.SUCCESS) {
    const address = handoffAddress(answer.data);
    // Outside any try: `redirect` throws to navigate. An absolute address is a
    // full-page navigation to another origin.
    if (address) redirect(address);
    return { error: START_VERIFICATION_FAILED, unavailable: false };
  }

  const slug = answer.message ?? '';

  // A `webapi` without the route (HTTP 404 through the exception filter), no
  // hand-off configured, or the step no longer the player's: nothing to send them
  // to. The standing the page shows is stale in the last case, so it re-reads.
  if (answer.code === ResponderCodes.NOT_FOUND || NO_PROVIDER_REFUSALS.has(slug)) {
    if (slug === 'verification-not-available') refresh();
    return { error: NO_VERIFICATION_PROVIDER, unavailable: true };
  }

  if (slug === 'declaration-required') {
    // Level 0: the page re-reads and shows the declaration form.
    refresh();
    return { error: START_VERIFICATION_ERRORS[slug], unavailable: false };
  }

  return {
    error: START_VERIFICATION_ERRORS[slug] ?? START_VERIFICATION_FAILED,
    unavailable: false,
  };
}
