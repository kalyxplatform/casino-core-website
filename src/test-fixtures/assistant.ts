/**
 * Backend feature 009's contract fixtures, copied key for key from
 * `casino-core-backend/specs/009-player-support-assistant/contracts/`. Those files
 * are the authority; these copies exist so the website's tests run without the
 * backend checked out beside it. The three recorded streams are copied as files,
 * under `src/test-fixtures/support/`.
 */

/** `conversation-read-none.json`. */
export const conversationReadNone = { code: 200, message: 'ok', data: { conversation: null } };

/** `conversation-read-success.json`. */
export const conversationReadSuccess = {
  code: 200,
  message: 'ok',
  data: {
    conversation: {
      status: 'open',
      created_at: '2026-10-04T12:00:00.000Z',
      last_turn_at: '2026-10-04T12:00:00.000Z',
      messages: [
        {
          turn_no: 1,
          role: 'player',
          text: 'Where is my win on Dragon Spins?',
          outcome: null,
          ticket_reference: null,
          created_at: '2026-10-04T12:00:00.000Z',
        },
        {
          turn_no: 1,
          role: 'assistant',
          text: 'Your records show a bet of 5 SC on Dragon Spins at 11:58 UTC and a win of 0 SC recorded with it. Your balance went from 39.61 SC to 34.61 SC.',
          outcome: 'answered',
          ticket_reference: null,
          created_at: '2026-10-04T12:00:07.412Z',
        },
      ],
      messages_truncated: false,
    },
  },
};

/** `conversation-open-success.json`. */
export const conversationOpenSuccess = {
  code: 200,
  message: 'ok',
  data: {
    conversation: {
      status: 'open',
      created_at: '2026-10-04T12:00:00.000Z',
      last_turn_at: null,
      messages: [],
      messages_truncated: false,
    },
  },
};

/** `conversation-close-success.json`. */
export const conversationCloseSuccess = { code: 200, message: 'ok', data: { status: 'closed' } };

/** `turn-request.json`. */
export const turnRequest = {
  submission_id: '0b9f6c1e-6a52-4a53-9d0e-2f1f0f6f1a11',
  message: 'Where is my win on Dragon Spins?',
};

/** `turn-replay-success.json`. */
export const turnReplaySuccess = {
  code: 200,
  message: 'ok',
  data: {
    replayed: true,
    turn_no: 3,
    outcome: 'ticketed',
    answer: 'I have opened ticket T-000124 so that a person can look at this.',
    ticket_reference: 'T-000124',
  },
};

/** `turn-replay-interrupted.json`. */
export const turnReplayInterrupted = {
  code: 200,
  message: 'ok',
  data: { replayed: true, turn_no: 4, outcome: 'interrupted', answer: '', ticket_reference: null },
};

/** `turn-invalid.json` — one example of a `400`'s one message. */
export const turnInvalid = {
  code: 400,
  message: 'message must be shorter than or equal to 2000 characters',
};

/* The refusals. */

/** `assistant-disabled.json`. */
export const assistantDisabled = { code: 415, message: 'assistant-disabled' };
/** `support-unavailable.json`. */
export const supportUnavailable = { code: 500, message: 'support-unavailable' };
/** `support-busy.json`. */
export const supportBusy = { code: 415, message: 'support-busy' };
/** `support-limit.json`. */
export const supportLimit = { code: 415, message: 'support-limit' };
/** `turn-in-progress.json`. */
export const turnInProgress = { code: 415, message: 'turn-in-progress' };
/** `conversation-closed.json`. */
export const conversationClosed = { code: 415, message: 'conversation-closed' };
/** `submission-rejected.json`. */
export const submissionRejected = { code: 415, message: 'submission-rejected' };

/**
 * NOT a 009 fixture: what a `webapi` without the conversation routes answers, on
 * HTTP STATUS 404 (the framework's body through the exception filter).
 */
export const routeNotFound = {
  code: 404,
  message: 'Route POST:/support/conversation/turns not found',
  error: 'Not Found',
};
