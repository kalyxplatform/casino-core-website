'use client';

import { useActionState } from 'react';
import { startVerificationAction } from '@/actions/verification';
import { CHECKING_SENTENCE, emptyStartVerification, type SessionStep } from '@/lib/verification';
import { Alert } from './Alert';
import { SubmitButton } from './SubmitButton';

/**
 * Backend feature 015 — the identity-document step on `/verification`.
 *
 * It takes a `SessionStep` (a kind and, for a resubmission, one sentence), never
 * the standing: the session's reference and hand-off address stay on the server
 * until the player presses the button, and then travel only in the redirect
 * `startVerificationAction` answers with. That is also why "Continue
 * verification" is a button and not a link to `resume_url`: a link would put the
 * reference in the page, and a prefetch of the hand-off creates a session.
 *
 * The `hint` is the verification provider's text: a React text child, never markup.
 */
const COPY: Record<SessionStep['kind'], { heading: string; body: string | null; button: string | null }> = {
  start: {
    heading: 'Verify your identity',
    body: 'Our verification partner checks a photo of your identity document. It takes a few minutes, and you come back here when it is done.',
    button: 'Verify now',
  },
  resume: {
    heading: 'Continue your verification',
    body: 'You started verifying your identity. Continue where you left off.',
    button: 'Continue verification',
  },
  resubmit: {
    heading: 'Your documents were sent back',
    body: null,
    button: 'Continue verification',
  },
  checking: {
    heading: 'Documents submitted',
    body: CHECKING_SENTENCE,
    button: null,
  },
};

export function VerificationStep({ step }: { step: SessionStep }) {
  const [state, start] = useActionState(startVerificationAction, emptyStartVerification);
  const copy = COPY[step.kind];

  return (
    <section
      aria-labelledby="verification-step-heading"
      className="rounded-xl border border-edge bg-surface p-5"
    >
      <h2 id="verification-step-heading" className="text-base font-semibold tracking-tight">
        {copy.heading}
      </h2>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
        {step.kind === 'resubmit' ? step.hint : copy.body}
      </p>

      {state.error && (
        <div className="mt-4">
          <Alert tone="error">{state.error}</Alert>
        </div>
      )}

      {copy.button && !state.unavailable && (
        <form action={start} className="mt-4">
          <SubmitButton pendingLabel="Opening…">{copy.button}</SubmitButton>
        </form>
      )}
    </section>
  );
}
