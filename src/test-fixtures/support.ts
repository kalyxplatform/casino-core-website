/**
 * Backend feature 008's contract fixtures, copied key for key from
 * `casino-core-backend/specs/008-support-tickets/contracts/`. Those files are the
 * authority; these copies exist so the website's tests run without the backend
 * checked out beside it.
 */

const categories = [
  'gameplay',
  'missing-win',
  'purchase',
  'verification',
  'account',
  'responsible-gambling',
  'other',
];

/** `ticket-list-success.json`. */
export const ticketListSuccess = {
  code: 200,
  message: 'ok',
  data: {
    categories,
    tickets: [
      {
        reference: 'T-000123',
        subject: 'My win did not arrive',
        category: 'missing-win',
        status: 'open',
        created_at: '2026-10-04T10:00:00.000Z',
        updated_at: '2026-10-04T10:00:00.000Z',
      },
    ],
  },
};

/** `ticket-list-empty.json`. */
export const ticketListEmpty = {
  code: 200,
  message: 'ok',
  data: { categories, tickets: [] },
};

/** `ticket-read-success.json`. */
export const ticketReadSuccess = {
  code: 200,
  message: 'ok',
  data: {
    reference: 'T-000123',
    subject: 'My win did not arrive',
    category: 'missing-win',
    status: 'open',
    created_at: '2026-10-04T10:00:00.000Z',
    updated_at: '2026-10-04T12:30:00.000Z',
    can_reply: true,
    timeline_truncated: false,
    timeline: [
      {
        kind: 'comment',
        author: 'player',
        message: 'I won on Irish Coins around 14:00 and my balance did not change.',
        status: null,
        created_at: '2026-10-04T10:00:00.000Z',
      },
      {
        kind: 'status',
        author: 'staff',
        message: null,
        status: { from: 'open', to: 'waiting_player' },
        created_at: '2026-10-04T11:00:00.000Z',
      },
      {
        kind: 'comment',
        author: 'staff',
        message: 'Which currency were you playing with?',
        status: null,
        created_at: '2026-10-04T11:00:00.000Z',
      },
      {
        kind: 'comment',
        author: 'player',
        message: 'Sweeps Coins.',
        status: null,
        created_at: '2026-10-04T12:30:00.000Z',
      },
      {
        kind: 'status',
        author: 'player',
        message: null,
        status: { from: 'waiting_player', to: 'open' },
        created_at: '2026-10-04T12:30:00.000Z',
      },
    ],
  },
};

/** `ticket-create-request.json`. */
export const ticketCreateRequest = {
  submission_id: '3f0e5c1a-7b0e-4c58-9a57-0d4f6f1f2a11',
  category: 'missing-win',
  subject: 'My win did not arrive',
  message: 'I won on Irish Coins around 14:00 and my balance did not change.',
};

/** `ticket-create-success.json`. */
export const ticketCreateSuccess = { code: 200, message: 'ok', data: { reference: 'T-000123' } };

/** `ticket-comment-request.json`. */
export const ticketCommentRequest = {
  submission_id: '9a1d2b3c-4e5f-4a6b-8c7d-0e1f2a3b4c5d',
  message: 'Sweeps Coins.',
};

/** `ticket-comment-success.json`. */
export const ticketCommentSuccess = { code: 200, message: 'ok', data: { reference: 'T-000123' } };

/** `ticket-close-success.json`. */
export const ticketCloseSuccess = { code: 200, message: 'ok', data: { reference: 'T-000123' } };

/** `ticket-invalid.json` — one example of a `400`'s one message. */
export const ticketInvalid = {
  code: 400,
  message: 'subject must be shorter than or equal to 120 characters',
};

/* The refusals. */

/** `support-disabled.json`. */
export const supportDisabled = { code: 415, message: 'support-disabled' };
/** `ticket-limit.json`. */
export const ticketLimit = { code: 415, message: 'ticket-limit' };
/** `submission-rejected.json`. */
export const submissionRejected = { code: 415, message: 'submission-rejected' };
/** `support-busy.json`. */
export const supportBusy = { code: 415, message: 'support-busy' };
/** `ticket-closed.json`. */
export const ticketClosed = { code: 415, message: 'ticket-closed' };
/** `comment-limit.json`. */
export const commentLimit = { code: 415, message: 'comment-limit' };
/** `ticket-not-found.json` — the business answer, on HTTP 200. */
export const ticketNotFound = { code: 404, message: 'ticket-not-found' };

/**
 * NOT a 008 fixture: what a `webapi` without the support routes answers, on HTTP
 * STATUS 404 (the framework's body through the exception filter). Told apart from
 * `ticketNotFound` by `message` alone, since `request()` keeps only the envelope.
 */
export const routeNotFound = {
  code: 404,
  message: 'Route GET:/support/tickets not found',
  error: 'Not Found',
};

/** `specs/001-player-auth-balance/contracts/unauthenticated.json`. */
export const unauthorized = { code: 403, message: 'Unauthorized' };
