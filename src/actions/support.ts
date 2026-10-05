'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import * as webapi from '@/lib/webapi';
import { ResponderCodes, type ApiResponse } from '@/lib/webapi';
import { readSession } from '@/lib/session';
import {
  ASSISTANT_ERRORS,
  ASSISTANT_FAILED,
  ASSISTANT_UNAVAILABLE,
  SUPPORT_ERRORS,
  SUPPORT_FAILED,
  SUPPORT_UNAVAILABLE,
  isReference,
  replyFormToWire,
  supportAvailability,
  ticketFormToWire,
  assistantAvailability,
  type CloseState,
  type ConversationActionState,
  type ReplyState,
  type TicketFormState,
} from '@/lib/support';

/**
 * Backend feature 008 — the player's three support writes.
 *
 * Nothing here logs (ticket text is the player's), nothing is cached, and the
 * answer is never handed back whole to the browser: a create navigates to the
 * ticket, a reply or a close re-renders the page, which re-reads on the server.
 *
 * One `submission_id` per form fill (FR-061): every refusal hands the SAME id back
 * so a retry is a replay, never a second ticket or a second reply; only
 * `submission-rejected` (the id is someone else's) and a landed reply get a new one.
 */

const UNUSABLE_REFERENCE = 'That ticket could not be found.';

/** The sentence for a refusal. A `400`'s one message is the rule's text, never the value, so it is shown as given. */
function refusal(answer: ApiResponse<unknown>): string {
  if (supportAvailability(answer) === 'unavailable') return SUPPORT_UNAVAILABLE;
  if (answer.code === ResponderCodes.BAD_REQUEST && answer.message) return answer.message;
  return SUPPORT_ERRORS[answer.message ?? ''] ?? SUPPORT_FAILED;
}

/** The id the next submit carries: a new one only when the backend says this one is not the player's. */
const nextSubmission = (answer: ApiResponse<unknown>, sent: string): string =>
  answer.code === ResponderCodes.REJECTED && answer.message === 'submission-rejected' ? randomUUID() : sent;

/** `POST /support/tickets`. On success, the ticket's own page. */
export async function createTicketAction(
  _previous: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await readSession();
  if (!session) redirect('/login');

  const body = ticketFormToWire(formData);
  // A form submitted before its script ran carries no id; mint one here and hand
  // it back, so the retry is still the same submission.
  if (!body.submission_id) body.submission_id = randomUUID();
  const values = { category: body.category, subject: body.subject, message: body.message };

  const answer = await webapi.createSupportTicket(session.token, body);

  // A JWT that has not expired is still refused once its `web_session` row is gone.
  if (answer.code === ResponderCodes.FORBIDDEN) redirect('/login');

  if (answer.code === ResponderCodes.SUCCESS) {
    const reference = answer.data?.reference;
    if (isReference(reference)) redirect(`/support/${reference}`);
    return { error: SUPPORT_FAILED, submissionId: body.submission_id, values };
  }

  return { error: refusal(answer), submissionId: nextSubmission(answer, body.submission_id), values };
}

/** `POST /support/tickets/:reference/comments`. On success, the page re-reads the thread. */
export async function replyAction(_previous: ReplyState, formData: FormData): Promise<ReplyState> {
  const body = replyFormToWire(formData);
  if (!body.submission_id) body.submission_id = randomUUID();
  const values = { message: body.message };

  const reference = formData.get('reference');
  if (!isReference(reference)) {
    return { error: UNUSABLE_REFERENCE, submissionId: body.submission_id, values };
  }

  const session = await readSession();
  if (!session) redirect('/login');

  const answer = await webapi.replyToSupportTicket(session.token, reference, body);

  if (answer.code === ResponderCodes.FORBIDDEN) redirect('/login');

  if (answer.code === ResponderCodes.SUCCESS) {
    refresh();
    // The reply landed: the next one is a new message, so it gets a new id.
    return { error: null, submissionId: randomUUID(), values: { message: '' } };
  }

  return { error: refusal(answer), submissionId: nextSubmission(answer, body.submission_id), values };
}

/** `POST /support/tickets/:reference/close`. Closing a closed ticket is a success. */
export async function closeAction(_previous: CloseState, formData: FormData): Promise<CloseState> {
  const reference = formData.get('reference');
  if (!isReference(reference)) return { error: UNUSABLE_REFERENCE };

  const session = await readSession();
  if (!session) redirect('/login');

  const answer = await webapi.closeSupportTicket(session.token, reference);

  if (answer.code === ResponderCodes.FORBIDDEN) redirect('/login');

  if (answer.code === ResponderCodes.SUCCESS) {
    refresh();
    return { error: null };
  }

  return { error: refusal(answer) };
}

/* --------------------------------------------------- the assistant (009) */

/**
 * Backend feature 009 — opening and closing the assistant's conversation. The
 * turn itself is not an action: its answer is a stream, relayed by
 * `app/api/support/turn`.
 *
 * Like the ticket writes, neither hands the backend's answer back: each answers
 * `{ ok, error }`, and on success the page re-reads the conversation on the server.
 */
function conversationAnswer(answer: ApiResponse<unknown>): ConversationActionState {
  const availability = assistantAvailability(answer);
  if (availability === 'signed-out') redirect('/login');
  if (availability === 'ok') {
    refresh();
    return { ok: true, error: null };
  }
  if (availability !== 'failed') return { ok: false, error: ASSISTANT_UNAVAILABLE };
  return { ok: false, error: ASSISTANT_ERRORS[answer.message ?? ''] ?? ASSISTANT_FAILED };
}

/** `POST /support/conversation`. An open conversation with no turns is returned as it is. */
export async function openConversationAction(): Promise<ConversationActionState> {
  const session = await readSession();
  if (!session) redirect('/login');
  return conversationAnswer(await webapi.openSupportConversation(session.token));
}

/** `POST /support/conversation/close`. Closing when none is open is a success. */
export async function closeConversationAction(): Promise<ConversationActionState> {
  const session = await readSession();
  if (!session) redirect('/login');
  return conversationAnswer(await webapi.closeSupportConversation(session.token));
}
