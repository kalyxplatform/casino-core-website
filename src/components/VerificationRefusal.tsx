import Link from 'next/link';
import type { VerificationHint } from '@/lib/verification';

/**
 * Under a Play or Buy refused with `verification-required` (backend feature 007):
 * what to do next, and where. The refusal sentence itself is the `Alert` above it.
 */
export function VerificationRefusal({ hint }: { hint: VerificationHint }) {
  return (
    <div className="rounded-lg border border-edge bg-surface px-3 py-2 text-sm">
      {hint.nextStep && <p className="text-ink">{hint.nextStep}</p>}
      <Link
        href="/verification"
        className={`${hint.nextStep ? 'mt-1 ' : ''}inline-block font-medium text-accent hover:underline`}
      >
        Go to verification
      </Link>
    </div>
  );
}
