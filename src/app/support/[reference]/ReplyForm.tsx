'use client';

import { useActionState, useRef } from 'react';
import { replyAction } from '@/actions/support';
import { emptyReply } from '@/lib/support';
import { Alert } from '@/components/Alert';
import { SubmitButton } from '@/components/SubmitButton';

/**
 * Reply on a ticket. On success the action re-renders the page, which re-reads
 * the thread, and hands back a NEW id for the next reply.
 *
 * One `submission_id` per reply (FR-061), held the same way as `TicketForm`'s:
 * minted in the browser on the first submit, reused on every retry of that reply.
 */
export function ReplyForm({ reference }: { reference: string }) {
  const [state, dispatch] = useActionState(replyAction, emptyReply);
  const fill = useRef<string | null>(null);

  const submit = (formData: FormData) => {
    if (fill.current === null && typeof crypto.randomUUID === 'function') {
      fill.current = crypto.randomUUID();
    }
    formData.set('submissionId', state.submissionId ?? fill.current ?? '');
    dispatch(formData);
  };

  return (
    <form action={submit} className="mt-4 space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="reference" value={reference} />
      <label className="block">
        <span className="sr-only">Your reply</span>
        <textarea
          name="message"
          required
          maxLength={4000}
          rows={4}
          defaultValue={state.values.message}
          className="field resize-y"
        />
      </label>
      <SubmitButton pendingLabel="Sending…">Send reply</SubmitButton>
    </form>
  );
}
