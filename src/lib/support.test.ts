import { describe, expect, it } from 'vitest';
import * as fixtures from '@/test-fixtures/support';
import * as assistant from '@/test-fixtures/assistant';
import {
  ASSISTANT_DISCLAIMER,
  ASSISTANT_ERRORS,
  ASSISTANT_FAILED,
  ASSISTANT_LABEL,
  ASSISTANT_PRIVACY_NOTE,
  ASSISTANT_UNAVAILABLE,
  OUTCOME_NOTES,
  SUPPORT_ERRORS,
  SUPPORT_UNAVAILABLE,
  assistantAvailability,
  isReference,
  isTurnOutcome,
  replyFormToWire,
  supportAvailability,
  ticketFormToWire,
  timelineRows,
} from '@/lib/support';
import type { SupportTimelineEntry } from '@/lib/webapi';

// Backend feature 008, US5 (T043) — the pure half of the /support page against the
// contracts: what goes on the wire, which references reach a path, and how each
// answer is read. FR-060, FR-061, FR-062.

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe('ticketFormToWire', () => {
  it('maps the form names onto EXACTLY ticket-create-request.json', () => {
    const body = ticketFormToWire(
      form({
        submissionId: fixtures.ticketCreateRequest.submission_id,
        category: 'missing-win',
        subject: '  My win did not arrive \n',
        message: '\tI won on Irish Coins around 14:00 and my balance did not change.  ',
      }),
    );
    expect(body).toStrictEqual(fixtures.ticketCreateRequest);
  });

  it('puts nothing else on the body, whatever the form carries', () => {
    const body = ticketFormToWire(
      form({
        submissionId: 'id',
        category: 'other',
        subject: 's',
        message: 'm',
        brand_id: '2',
        player_id: '9',
        priority: 'high',
        $ACTION_ID_x: '',
      }),
    );
    expect(Object.keys(body).sort()).toEqual(['category', 'message', 'subject', 'submission_id']);
  });

  it('a missing field is an empty string, never "null" — the backend refuses it with its one message', () => {
    expect(ticketFormToWire(new FormData())).toStrictEqual({
      submission_id: '',
      category: '',
      subject: '',
      message: '',
    });
  });
});

describe('replyFormToWire', () => {
  it('maps onto EXACTLY ticket-comment-request.json and nothing else', () => {
    const body = replyFormToWire(
      form({
        submissionId: fixtures.ticketCommentRequest.submission_id,
        message: '  Sweeps Coins. ',
        reference: 'T-000123',
        status: 'closed',
      }),
    );
    expect(body).toStrictEqual(fixtures.ticketCommentRequest);
  });
});

describe('isReference', () => {
  it.each(['T-000123', 'T-123456789012345', 'T-000000'])('%s is a reference', (value) => {
    expect(isReference(value)).toBe(true);
  });

  it.each([
    'T-123',
    'T-1234567890123456',
    '../x',
    'T-000123/close',
    'T-000123?x=1',
    't-000123',
    ' T-000123',
    'T-000123 ',
    'T-000123\n',
    '%2e%2e',
    '',
  ])('%j is not', (value) => {
    expect(isReference(value)).toBe(false);
  });

  it('anything not a string is not', () => {
    expect(isReference(null)).toBe(false);
    expect(isReference(undefined)).toBe(false);
    expect(isReference(123456)).toBe(false);
    expect(isReference(['T-000123'])).toBe(false);
  });
});

describe('supportAvailability — the two 404s told apart by message (design M5)', () => {
  it('415 support-disabled ⇒ unavailable', () => {
    expect(supportAvailability(fixtures.supportDisabled)).toBe('unavailable');
  });

  it('a 404 whose message is NOT ticket-not-found ⇒ unavailable (the API has not shipped)', () => {
    expect(supportAvailability(fixtures.routeNotFound)).toBe('unavailable');
    expect(supportAvailability({ code: 404 })).toBe('unavailable');
  });

  it('404 ticket-not-found ⇒ not-found', () => {
    expect(supportAvailability(fixtures.ticketNotFound)).toBe('not-found');
  });

  it('403 ⇒ signed-out', () => {
    expect(supportAvailability(fixtures.unauthorized)).toBe('signed-out');
  });

  it('200 ⇒ ok', () => {
    expect(supportAvailability(fixtures.ticketListSuccess)).toBe('ok');
    expect(supportAvailability(fixtures.ticketReadSuccess)).toBe('ok');
  });

  it('anything else (an outage, another refusal) ⇒ failed, never ok', () => {
    expect(supportAvailability({ code: 500, message: 'The service is unreachable.' })).toBe('failed');
    expect(supportAvailability(fixtures.ticketLimit)).toBe('failed');
  });
});

describe('SUPPORT_ERRORS (FR-062)', () => {
  it.each(['ticket-limit', 'ticket-closed', 'comment-limit', 'submission-rejected', 'support-busy'])(
    '%s has a sentence that is not the slug',
    (slug) => {
      const sentence = SUPPORT_ERRORS[slug];
      expect(typeof sentence).toBe('string');
      expect(sentence).not.toContain(slug);
      expect(sentence).toMatch(/^[A-Z].*\.$/);
    },
  );

  it('support-disabled is the unavailable notice', () => {
    expect(SUPPORT_ERRORS['support-disabled']).toBe(SUPPORT_UNAVAILABLE);
    expect(SUPPORT_UNAVAILABLE).toBe('Support is not available.');
  });
});

describe('timelineRows', () => {
  const timeline = fixtures.ticketReadSuccess.data.timeline as SupportTimelineEntry[];

  it('maps the fixture to view rows without losing order or an entry', () => {
    const rows = timelineRows(timeline);
    expect(rows.map((row) => row.kind)).toEqual(['comment', 'status', 'comment', 'comment', 'status']);
    expect(rows.map((row) => row.at)).toEqual(timeline.map((entry) => entry.created_at));
  });

  it('a comment keeps its text exactly and says who wrote it', () => {
    const [first, , staff, reply] = timelineRows(timeline);
    expect(first).toMatchObject({ kind: 'comment', who: 'You', text: timeline[0].message });
    expect(staff).toMatchObject({ kind: 'comment', who: 'Support', text: 'Which currency were you playing with?' });
    expect(reply).toMatchObject({ kind: 'comment', who: 'You', text: 'Sweeps Coins.' });
  });

  it('a status is a one-line note naming where it went', () => {
    const rows = timelineRows(timeline);
    expect(rows[1]).toMatchObject({ kind: 'status' });
    expect(rows[1].kind === 'status' && rows[1].note).toMatch(/waiting for you/i);
    expect(rows[4].kind === 'status' && rows[4].note).toMatch(/open/i);
  });

  it('an assistant-authored comment is named as the assistant, never as Support (SEC-M7)', () => {
    const [assistantRow, systemRow] = timelineRows([
      { ...timeline[2], author: 'assistant', message: 'I have opened this ticket for you.' },
      { ...timeline[2], author: 'system' },
    ]);
    expect(assistantRow).toMatchObject({
      kind: 'comment',
      who: 'Assistant',
      text: 'I have opened this ticket for you.',
    });
    expect(systemRow).toMatchObject({ kind: 'comment', who: 'Support' });
  });

  it('markup in a message stays text — it is never parsed', () => {
    const [row] = timelineRows([
      { ...timeline[0], message: '<img src=x onerror=alert(1)> https://evil.test' },
    ]);
    expect(row).toMatchObject({ kind: 'comment', text: '<img src=x onerror=alert(1)> https://evil.test' });
  });
});

// Backend feature 009, T063 — how the chat reads an answer, and its words.

describe('assistantAvailability', () => {
  it('200 ⇒ ok, with or without a conversation', () => {
    expect(assistantAvailability(assistant.conversationReadNone)).toBe('ok');
    expect(assistantAvailability(assistant.conversationReadSuccess)).toBe('ok');
  });

  it('403 ⇒ signed-out', () => {
    expect(assistantAvailability(fixtures.unauthorized)).toBe('signed-out');
    expect(assistantAvailability({ code: 403 })).toBe('signed-out');
  });

  it('415 support-disabled ⇒ unavailable', () => {
    expect(assistantAvailability(fixtures.supportDisabled)).toBe('unavailable');
  });

  it('an HTTP 404 before the API ships ⇒ unavailable, whatever its message', () => {
    expect(assistantAvailability(assistant.routeNotFound)).toBe('unavailable');
    expect(assistantAvailability({ code: 404 })).toBe('unavailable');
    expect(assistantAvailability({ code: 404, message: 'not-found' })).toBe('unavailable');
  });

  it('415 assistant-disabled ⇒ no-assistant', () => {
    expect(assistantAvailability(assistant.assistantDisabled)).toBe('no-assistant');
  });

  it('anything else (an outage, a refusal of a turn) ⇒ failed, never ok', () => {
    expect(assistantAvailability(assistant.supportUnavailable)).toBe('failed');
    expect(assistantAvailability(assistant.supportLimit)).toBe('failed');
    expect(assistantAvailability({ code: 500, message: 'The service is unreachable.' })).toBe('failed');
  });
});

describe('ASSISTANT_ERRORS (FR-098)', () => {
  it.each([
    'support-limit',
    'support-busy',
    'turn-in-progress',
    'conversation-closed',
    'support-unavailable',
    'submission-rejected',
    'assistant-disabled',
  ])('%s has a sentence that is not the slug', (slug) => {
    const sentence = ASSISTANT_ERRORS[slug];
    expect(typeof sentence).toBe('string');
    expect(sentence).not.toContain(slug);
    expect(sentence).toMatch(/^[A-Z].*\.$/);
  });

  it('the refusals that end the chat for now all point at the ticket form', () => {
    for (const slug of ['support-limit', 'support-unavailable', 'assistant-disabled']) {
      expect(ASSISTANT_ERRORS[slug]).toMatch(/ticket/i);
    }
    expect(ASSISTANT_ERRORS['support-unavailable']).toBe(ASSISTANT_UNAVAILABLE);
    expect(ASSISTANT_UNAVAILABLE).toMatch(/ticket/i);
    expect(ASSISTANT_FAILED).toMatch(/^[A-Z].*\.$/);
  });
});

describe('OUTCOME_NOTES', () => {
  const OUTCOMES = ['answered', 'ticketed', 'budget', 'refused', 'truncated', 'interrupted', 'failed'];

  it('has an entry for each outcome, and for nothing else', () => {
    expect(Object.keys(OUTCOME_NOTES).sort()).toEqual([...OUTCOMES].sort());
  });

  it('an entry is a sentence, or null where the answer itself says it', () => {
    for (const outcome of OUTCOMES) {
      const note = OUTCOME_NOTES[outcome as keyof typeof OUTCOME_NOTES];
      if (note !== null) expect(note).toMatch(/^[A-Z].*\.$/);
    }
    // No text of its own arrives for these two, so the page must say something.
    expect(OUTCOME_NOTES.interrupted).not.toBeNull();
    expect(OUTCOME_NOTES.failed).not.toBeNull();
  });

  it('isTurnOutcome knows exactly those', () => {
    for (const outcome of OUTCOMES) expect(isTurnOutcome(outcome)).toBe(true);
    expect(isTurnOutcome('toString')).toBe(false);
    expect(isTurnOutcome('')).toBe(false);
    expect(isTurnOutcome(null)).toBe(false);
  });
});

describe('the labels (SEC-M7)', () => {
  it('say the answers are automated and not a commitment', () => {
    expect(ASSISTANT_LABEL).toMatch(/automated/i);
    expect(ASSISTANT_DISCLAIMER).toMatch(/automated/i);
    expect(ASSISTANT_DISCLAIMER).toMatch(/not a commitment/i);
  });

  it('say an AI service processes the messages, and what not to share', () => {
    expect(ASSISTANT_PRIVACY_NOTE).toMatch(/AI service/);
    expect(ASSISTANT_PRIVACY_NOTE).toMatch(/passwords/);
    expect(ASSISTANT_PRIVACY_NOTE).toMatch(/card numbers/);
    expect(ASSISTANT_PRIVACY_NOTE).toMatch(/documents/);
  });
});
