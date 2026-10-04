'use client';

import { useActionState, useRef } from 'react';
import { createTicketAction } from '@/actions/support';
import { categoryLabel, emptyTicketForm } from '@/lib/support';
import { Alert } from '@/components/Alert';
import { SubmitButton } from '@/components/SubmitButton';

/**
 * Open a ticket. On success the action navigates to the new ticket's page.
 *
 * ONE `submission_id` per form fill (FR-061). It is minted in the browser on the
 * first submit and kept in a ref, so a double click, a retry after a refusal, or a
 * retry after the answer was lost in transit all carry the same id — the backend
 * answers each with the original ticket, never a second one. The action hands
 * back the id the next submit must carry (a new one only after
 * `submission-rejected`). A remount — a new visit to the page — is a new fill.
 *
 * It is set on the FormData rather than rendered into a hidden input: an id
 * minted during render would differ between the server's HTML and hydration.
 */
export function TicketForm({ categories }: { categories: string[] }) {
  const [state, dispatch] = useActionState(createTicketAction, emptyTicketForm);
  const fill = useRef<string | null>(null);

  const submit = (formData: FormData) => {
    if (fill.current === null && typeof crypto.randomUUID === 'function') {
      fill.current = crypto.randomUUID();
    }
    // Empty only where the browser has no `randomUUID` (an insecure origin): the
    // action mints one and hands it back for the retry.
    formData.set('submissionId', state.submissionId ?? fill.current ?? '');
    dispatch(formData);
  };

  return (
    <form action={submit} className="mt-4 space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <label className="block">
        <span className="text-sm text-ink-muted">Topic</span>
        {/*
          React applies a select's `defaultValue` only when it mounts, and the form is
          reset after every submit — so without the key a refused submit comes back
          with no topic chosen, and `required` blocks the retry. The key remounts it
          with the value the action handed back.
        */}
        <select
          key={state.values.category}
          name="category"
          required
          defaultValue={state.values.category}
          className="field mt-1"
        >
          <option value="" disabled>
            Choose a topic
          </option>
          {categories.map((slug) => (
            <option key={slug} value={slug}>
              {categoryLabel(slug)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-ink-muted">Subject</span>
        <input
          name="subject"
          required
          maxLength={120}
          defaultValue={state.values.subject}
          className="field mt-1"
        />
      </label>

      <label className="block">
        <span className="text-sm text-ink-muted">Message</span>
        <textarea
          name="message"
          required
          maxLength={4000}
          rows={5}
          defaultValue={state.values.message}
          className="field mt-1 resize-y"
        />
      </label>

      <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
    </form>
  );
}
