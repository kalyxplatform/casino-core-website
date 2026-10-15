import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VerificationStep } from '@/components/VerificationStep';
import { RESUBMIT_SENTENCE, sessionStep } from '@/lib/verification';
import type { VerificationStanding } from '@/lib/webapi';
import * as fixtures from '@/test-fixtures/verification';

// Backend feature 015, T069 — the step the verification page offers, for each
// session status of contracts §1.

vi.mock('@/actions/verification', () => ({
  startVerificationAction: async () => ({ error: null, unavailable: false }),
}));

afterEach(cleanup);

const stepOf = (body: { data: unknown }) => {
  const step = sessionStep(body.data as VerificationStanding);
  if (!step) throw new Error('expected a step');
  return step;
};

describe('VerificationStep', () => {
  it('submit with no session: "Verify now"', () => {
    render(<VerificationStep step={stepOf(fixtures.standingSessionNoneSubmit)} />);
    expect(screen.getByRole('button', { name: 'Verify now' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Continue verification' })).toBeNull();
  });

  it('started: "Continue verification"', () => {
    render(<VerificationStep step={stepOf(fixtures.standingSessionStarted)} />);
    expect(screen.getByRole('button', { name: 'Continue verification' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Verify now' })).toBeNull();
  });

  it.each([
    ['submitted', fixtures.standingSessionSubmitted],
    ['review', fixtures.standingSessionReview],
  ])('%s: "We are checking your documents", and nothing to press', (_name, body) => {
    const { container } = render(<VerificationStep step={stepOf(body)} />);
    expect(container.textContent).toContain('We are checking your documents.');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('resubmission with a hint: the hint, and the way back in', () => {
    const { container } = render(
      <VerificationStep step={stepOf(fixtures.standingSessionResubmission)} />,
    );
    expect(container.textContent).toContain('Poor image quality');
    expect(container.textContent).not.toContain(RESUBMIT_SENTENCE);
    expect(screen.getByRole('button', { name: 'Continue verification' })).toBeTruthy();
  });

  it('resubmission with hint null: the site\'s own sentence', () => {
    const { container } = render(
      <VerificationStep step={stepOf(fixtures.standingSessionResubmissionNoHint)} />,
    );
    expect(container.textContent).toContain('Please submit your documents again.');
  });

  it('the hint is the provider\'s text: rendered as TEXT, never markup', () => {
    const hostile = '<img src=x onerror="alert(1)"><b>bold</b>';
    const { container } = render(<VerificationStep step={{ kind: 'resubmit', hint: hostile }} />);
    expect(container.textContent).toContain(hostile);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('carries no address of the verification provider\'s, and no reference', () => {
    const { container } = render(
      <VerificationStep step={stepOf(fixtures.standingSessionStarted)} />,
    );
    expect(container.innerHTML).not.toContain(fixtures.verificationReference015);
    expect(container.innerHTML).not.toContain('integrations.platform.example');
    expect(container.querySelector('a')).toBeNull();
  });
});
