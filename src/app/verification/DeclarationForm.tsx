'use client';

import { useActionState } from 'react';
import { declareAction } from '@/actions/verification';
import { emptyDeclaration } from '@/lib/verification';
import type { CountryOption } from '@/lib/webapi';
import { Alert } from '@/components/Alert';
import { DeclarationFields } from '@/components/DeclarationFields';
import { SubmitButton } from '@/components/SubmitButton';

/** `POST /verification/declaration`. On success the action re-renders this page. */
export function DeclarationForm({
  countries,
  defaultCountryId,
}: {
  countries: CountryOption[];
  defaultCountryId: string;
}) {
  const [state, declare] = useActionState(declareAction, emptyDeclaration);

  return (
    <form action={declare} className="mt-5 space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <DeclarationFields
        countries={countries}
        defaults={state.values}
        defaultCountryId={defaultCountryId}
      />
      <SubmitButton pendingLabel="Recording…">Declare my identity</SubmitButton>
    </form>
  );
}
