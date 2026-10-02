import 'server-only';

import * as webapi from './webapi';
import { nextStepText, standingFrom, type StandingResult, type VerificationHint } from './verification';

/**
 * Backend feature 007 — the server-side reads every page and action shares.
 *
 * Kept out of `actions/` on purpose: an async function exported from a
 * `'use server'` module is a Server Action the browser can call by id, and these
 * are helpers, not endpoints.
 *
 * Nothing here caches or logs: `getVerification` is `no-store`, and the standing
 * is returned to the caller and nowhere else (SEC-M10).
 */

export async function readStanding(token: string): Promise<StandingResult> {
  return standingFrom(await webapi.getVerification(token));
}

/**
 * What a refused Play or Buy shows as its next step.
 *
 * The refusal itself says only `verification-required`; the standing says what to
 * do about it. One extra read, and only on a refusal. If the standing cannot be
 * read the hint is empty and the player still gets the link to the page.
 */
export async function refusalHint(token: string): Promise<VerificationHint> {
  const result = await readStanding(token);
  return {
    nextStep: result.status === 'standing' ? nextStepText(result.standing.next_step) : null,
  };
}
