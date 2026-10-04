'use client';

import { useActionState } from 'react';
import { closeAction } from '@/actions/support';
import { emptyClose } from '@/lib/support';
import { Alert } from '@/components/Alert';
import { SubmitButton } from '@/components/SubmitButton';

/** Close a ticket. Closing one that is already closed is a success; the page re-reads. */
export function CloseTicket({ reference }: { reference: string }) {
  const [state, close] = useActionState(closeAction, emptyClose);

  return (
    <form action={close} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="reference" value={reference} />
      <SubmitButton variant="quiet" pendingLabel="Closing…">
        Close ticket
      </SubmitButton>
    </form>
  );
}
