import { describe, expect, it } from 'vitest';
import type { ApiResponse, VerificationStanding } from '@/lib/webapi';
import {
  CHECKING_SENTENCE,
  RESUBMIT_SENTENCE,
  handoffAddress,
  noticeView,
  returnParams,
  sessionStep,
  standingFrom,
} from '@/lib/verification';
import * as fixtures from '@/test-fixtures/verification';

// Backend feature 015, T069 — reading `verification_session` (contracts §1) into
// the one step the page offers, and the return page's one parameter.

const standing = (body: unknown): VerificationStanding => {
  const result = standingFrom(body as ApiResponse<VerificationStanding>);
  if (result.status !== 'standing') throw new Error(`expected a standing, got ${result.status}`);
  return result.standing;
};

describe('tolerance: the standing without 015', () => {
  it('a standing with NO verification_session key still reads, and offers no session step', () => {
    expect('verification_session' in fixtures.standingClear.data).toBe(false);
    const read = standing(fixtures.standingClear);
    expect(sessionStep(read)).toBeNull();
    expect(noticeView(read).step).toBeNull();
  });

  it('a 007-shaped standing saying `submit` with no key ⇒ "Verify now"', () => {
    const without: Record<string, unknown> = { ...fixtures.standingSessionNoneSubmit.data };
    delete without.verification_session;
    expect(sessionStep(standing({ code: 200, data: without }))).toEqual({ kind: 'start' });
  });

  it('a verification_session this site cannot read is ignored, never a crash', () => {
    for (const odd of ['started', 7, [], { status: 42 }]) {
      const body = {
        code: 200,
        data: { ...fixtures.standingSessionNoneSubmit.data, verification_session: odd },
      };
      expect(sessionStep(standing(body))).toEqual({ kind: 'start' });
    }
  });
});

describe('each session status → its step (contracts §1)', () => {
  it.each([
    ['standing-session-none-submit', fixtures.standingSessionNoneSubmit, { kind: 'start' }],
    ['standing-session-started', fixtures.standingSessionStarted, { kind: 'resume' }],
    ['standing-session-submitted', fixtures.standingSessionSubmitted, { kind: 'checking' }],
    ['a session in review', fixtures.standingSessionReview, { kind: 'checking' }],
    [
      'standing-session-resubmission',
      fixtures.standingSessionResubmission,
      { kind: 'resubmit', hint: 'Poor image quality' },
    ],
    ['standing-session-provider-off', fixtures.standingSessionProviderOff, null],
    ['standing-session-declined-exhausted', fixtures.standingSessionDeclinedExhausted, null],
  ])('%s', (_name, body, step) => {
    expect(sessionStep(standing(body))).toEqual(step);
  });

  it('a resubmission whose hint is null ⇒ the WEBSITE\'s own fixed sentence, and no other', () => {
    expect(sessionStep(standing(fixtures.standingSessionResubmissionNoHint))).toEqual({
      kind: 'resubmit',
      hint: RESUBMIT_SENTENCE,
    });
    expect(RESUBMIT_SENTENCE).toBe('Please submit your documents again.');
  });

  it('a lapsed session is a new start', () => {
    const data = fixtures.standingSessionStarted.data;
    const body = { code: 200, data: { ...data, verification_session: { ...data.verification_session, status: 'lapsed' } } };
    expect(sessionStep(standing(body))).toEqual({ kind: 'start' });
  });

  it('a started session the standing no longer offers (next_step none) is not resumable', () => {
    const body = { code: 200, data: { ...fixtures.standingSessionStarted.data, next_step: 'none' } };
    expect(sessionStep(standing(body))).toBeNull();
  });

  it('"we are checking" is one fixed sentence', () => {
    expect(CHECKING_SENTENCE).toBe('We are checking your documents.');
  });
});

describe('what reaches the browser', () => {
  it.each([
    ['started', fixtures.standingSessionStarted],
    ['resubmission', fixtures.standingSessionResubmission],
    ['submitted', fixtures.standingSessionSubmitted],
  ])('%s: the notice carries neither the reference, the hand-off address nor the declaration', (_n, body) => {
    const serialised = JSON.stringify(noticeView(standing(body)));
    expect(serialised).not.toContain(fixtures.verificationReference015);
    expect(serialised).not.toContain('integrations.platform.example');
    expect(serialised).not.toContain('Alvarez');
  });
});

describe('the start\'s answer → where the browser goes', () => {
  it('session-start-success: the hand-off address', () => {
    expect(handoffAddress(fixtures.sessionStartSuccess.data)).toBe(fixtures.verificationHandoff015);
  });

  it.each([
    [undefined],
    [null],
    [{}],
    [{ redirect_url: 'not a url' }],
    [{ redirect_url: 'http://integrations.platform.example/verification/handoff/x' }],
    [{ redirect_url: 'javascript:alert(1)' }],
    [{ redirect_url: '/verification/return' }],
  ])('%j ⇒ nowhere', (data) => {
    expect(handoffAddress(data)).toBeNull();
  });
});

describe('the return page reads ONLY `closed`', () => {
  it('closed=1 ⇒ closed', () => {
    expect(returnParams({ closed: '1' })).toEqual({ closed: true });
  });

  it.each([[{}], [{ closed: '0' }], [{ closed: ['1', '1'] }], [{ closed: 'yes' }]])(
    '%j ⇒ not closed',
    (params) => {
      expect(returnParams(params)).toEqual({ closed: false });
    },
  );

  it('every other parameter is dropped, whatever it is called', () => {
    const read = returnParams({
      closed: '1',
      reference: fixtures.verificationReference015,
      sessionId: 'abc',
      provider_url: 'https://alchemy.veriff.com/v/x',
      status: 'approved',
    });
    expect(read).toEqual({ closed: true });
  });
});
