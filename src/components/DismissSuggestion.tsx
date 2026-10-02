'use client';

import { useActionState } from 'react';
import { dismissAction } from '@/actions/verification';
import { emptyDismiss } from '@/lib/verification';

/**
 * "Not now" on one suggested rule. The rule's name is the whole body of
 * `POST /verification/dismissals`; the action refreshes the page on success, and
 * the suggestion is hidden here at once rather than waiting for that render.
 */
export function DismissSuggestion({ rule }: { rule: string }) {
  const [state, dismiss, pending] = useActionState(dismissAction, emptyDismiss);
  if (state.dismissed) return null;

  return (
    <form action={dismiss} className="shrink-0 text-right">
      <input type="hidden" name="rule" value={rule} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink-muted transition hover:border-ink-muted hover:text-ink disabled:opacity-60"
      >
        {pending ? 'Dismissing…' : 'Not now'}
      </button>
      {state.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
