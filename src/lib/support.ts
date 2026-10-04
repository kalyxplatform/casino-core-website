import type {
  CreateSupportTicketBody,
  SupportReplyBody,
  SupportTicketStatus,
  SupportTimelineEntry,
} from './webapi';

/**
 * Backend feature 008 — reading the support answers into what `/support` shows,
 * and the form → wire mapping for its two writes.
 *
 * Pure functions, types and constants only, so client components, Server Actions
 * and tests can all import it. It is NOT `server-only` and must not become a
 * `'use server'` module: those may export only async functions (see
 * `checkout-state.ts`), and the empty states below are real objects.
 *
 * Ticket text (subjects, messages — the player's and staff's) is never parsed,
 * linked or turned into markup here: `timelineRows` copies it as a string, and
 * the pages render it as a React text child.
 */

/* ------------------------------------------------------------- references */

const REFERENCE = /^T-\d{6,15}$/;

/**
 * Whether a value from the URL or a form may be put into a `webapi` path (SEC-M12).
 * The backend formats references as `T-` and at least six digits; anything else —
 * `../x`, `T-000123/close`, a query string — never reaches `webapi`.
 */
export const isReference = (value: unknown): value is string =>
  typeof value === 'string' && REFERENCE.test(value);

/* ----------------------------------------------------------- availability */

/**
 * How a support answer is read.
 *
 * - `unavailable` — `415 support-disabled`, OR a `404` whose message is not
 *   `ticket-not-found`: a `webapi` that has not shipped the routes answers the
 *   framework's HTTP 404, and `request()` keeps only the envelope, so the message
 *   is the only thing that tells it from the business answer (design M5). Never
 *   by `code` alone.
 * - `not-found` — HTTP 200 carrying `404 ticket-not-found`: not this player's ticket.
 * - `signed-out` — `403`: the session is gone.
 * - `failed` — anything else that is not a `200`: an outage, or a refusal the
 *   caller reads itself.
 */
export type SupportAvailability = 'ok' | 'unavailable' | 'not-found' | 'signed-out' | 'failed';

export const TICKET_NOT_FOUND = 'ticket-not-found';

export function supportAvailability(answer: { code: number; message?: string }): SupportAvailability {
  if (answer.code === 200) return 'ok';
  if (answer.code === 403) return 'signed-out';
  if (answer.code === 404) return answer.message === TICKET_NOT_FOUND ? 'not-found' : 'unavailable';
  if (answer.code === 415 && answer.message === 'support-disabled') return 'unavailable';
  return 'failed';
}

/* ------------------------------------------------------------------ words */

export const SUPPORT_UNAVAILABLE = 'Support is not available.';

/** Slugs in, sentences out (contracts README, "What the website does with each refusal"). */
export const SUPPORT_ERRORS: Record<string, string> = {
  'support-disabled': SUPPORT_UNAVAILABLE,
  'ticket-limit':
    "You've reached the limit for open or new tickets. Add to an existing ticket, or try again tomorrow.",
  'support-busy': 'Still sending your last message. Try again in a moment.',
  'ticket-closed': 'This ticket is closed. Open a new one.',
  'comment-limit': "You've sent a lot of messages on this ticket today. Try again tomorrow.",
  'submission-rejected': 'Please send that again.',
  [TICKET_NOT_FOUND]: 'That ticket could not be found.',
};

/** For any answer this page has no sentence for. Never the backend's own text. */
export const SUPPORT_FAILED = 'Your message could not be sent right now. Try again shortly.';

export const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_player: 'Waiting for you',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** A status slug as words. An unknown one is shown as given rather than hidden. */
export const statusLabel = (status: string): string =>
  STATUS_LABELS[status as SupportTicketStatus] ?? status;

/** `missing-win` → `Missing win`. Categories are policy slugs, never free text. */
export const categoryLabel = (slug: string): string => {
  const words = slug.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const INSTANT = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** An ISO instant from the wire as `4 Oct 2026, 10:00 UTC`. One that does not parse is shown as given. */
export const formatInstant = (iso: string): string => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : `${INSTANT.format(at)} UTC`;
};

/* --------------------------------------------------------------- timeline */

export type TimelineRow =
  | { kind: 'comment'; who: 'You' | 'Support'; text: string; at: string }
  | { kind: 'status'; note: string; at: string };

/**
 * The thread as rows, in the order the backend sent it (oldest first). A comment
 * keeps its text EXACTLY; the player's own is "You", everything else ("staff",
 * "assistant", "system") is "Support". A status becomes a one-line note.
 */
export function timelineRows(timeline: SupportTimelineEntry[]): TimelineRow[] {
  return timeline.map((entry): TimelineRow => {
    if (entry.kind === 'status' && entry.status) {
      return {
        kind: 'status',
        note: `Status changed to ${statusLabel(entry.status.to).toLowerCase()}.`,
        at: entry.created_at,
      };
    }
    return {
      kind: 'comment',
      who: entry.author === 'player' ? 'You' : 'Support',
      text: typeof entry.message === 'string' ? entry.message : '',
      at: entry.created_at,
    };
  });
}

/* ------------------------------------------------------------ form → wire */

const field = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * The open-a-ticket form onto EXACTLY `ticket-create-request.json`. The form's
 * names (`submissionId`) are the form's, not the wire's; this is the one place
 * they are mapped, and nothing else the form carries reaches the body.
 */
export const ticketFormToWire = (formData: FormData): CreateSupportTicketBody => ({
  submission_id: field(formData, 'submissionId'),
  category: field(formData, 'category'),
  subject: field(formData, 'subject'),
  message: field(formData, 'message'),
});

/** The reply form onto EXACTLY `ticket-comment-request.json`. */
export const replyFormToWire = (formData: FormData): SupportReplyBody => ({
  submission_id: field(formData, 'submissionId'),
  message: field(formData, 'message'),
});

/* ------------------------------------------------------------------ state */

/**
 * `submissionId` is the id the NEXT submit of this form must carry: the same one
 * after any refusal (a retry is then a replay, never a second ticket — FR-061),
 * a new one after `submission-rejected`, and `null` before the first submit (the
 * form mints one in the browser with `crypto.randomUUID()`).
 */
export interface TicketFormValues {
  category: string;
  subject: string;
  message: string;
}

export interface TicketFormState {
  error: string | null;
  submissionId: string | null;
  values: TicketFormValues;
}

export const emptyTicketForm: TicketFormState = {
  error: null,
  submissionId: null,
  values: { category: '', subject: '', message: '' },
};

/** After a reply lands, `submissionId` is a NEW id: the next reply is a new message. */
export interface ReplyState {
  error: string | null;
  submissionId: string | null;
  values: { message: string };
}

export const emptyReply: ReplyState = { error: null, submissionId: null, values: { message: '' } };

export interface CloseState {
  error: string | null;
}

export const emptyClose: CloseState = { error: null };
