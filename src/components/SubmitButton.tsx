'use client';

import { useFormStatus } from 'react-dom';

/**
 * A submit button that disables itself while its form is in flight.
 *
 * Casino users expect instant feedback, and a checkout button that can be
 * double-clicked is the one that produces two orders — the backend answers the
 * second with `checkout-in-progress` rather than charging twice, but the player
 * should not see that message for a click they did not mean to make.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: 'primary' | 'quiet';
}) {
  const { pending } = useFormStatus();

  const base =
    'inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';
  const skin =
    variant === 'primary'
      ? 'bg-accent text-accent-ink hover:brightness-110'
      : 'border border-edge bg-surface-raised text-ink hover:border-ink-muted';

  return (
    <button type="submit" disabled={pending} className={`${base} ${skin}`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
