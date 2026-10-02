'use client';

import { useActionState, useState } from 'react';
import { registerAction, type RegisterState } from '@/actions/auth';
import type { CountryOption } from '@/lib/webapi';
import { minimumAgeFor, type SignUpRequirements } from '@/lib/verification';
import { SubmitButton } from '@/components/SubmitButton';
import { Alert } from '@/components/Alert';
import { DeclarationFields } from '@/components/DeclarationFields';

const initialState: RegisterState = { error: null, declarationRequired: false, values: {} };

/**
 * Sign-up, shaped by the brand's verification policy (backend feature 007, §4/§7).
 *
 * The identity fields appear when the requirements route said a declaration is
 * required, or when `POST /registration` refused for want of one. The age shown is
 * the selected country's minimum where the brand sets one; the backend's age check
 * is the authority, this only says it up front.
 */
export function RegisterForm({
  countries,
  requirements,
}: {
  countries: CountryOption[];
  requirements: SignUpRequirements;
}) {
  const [state, formAction] = useActionState(registerAction, initialState);
  const [countryId, setCountryId] = useState('');
  const declaring = requirements.declarationRequired || state.declarationRequired;

  const selectedCountry = countries.find(
    (country) => String(country.id) === (countryId || state.values.countryId),
  );
  const minimumAge = minimumAgeFor(requirements, selectedCountry?.iso_code2);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {countries.length === 0 && (
        <Alert tone="error">No countries are available right now. Registration is closed.</Alert>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="player@example.com"
          defaultValue={state.values.email ?? ''}
          className="field"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="field"
        />
        {/*
          The same rule the backend enforces, stated up front. The server is
          still the authority — this only saves a round trip to be told it.
        */}
        <p className="text-xs text-ink-muted">
          8–72 characters, with an upper-case letter, a lower-case letter, a digit and a symbol.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="countryId" className="block text-sm font-medium">
          Country
        </label>
        <select
          id="countryId"
          name="countryId"
          required
          defaultValue={state.values.countryId ?? ''}
          onChange={(event) => setCountryId(event.target.value)}
          className="field"
        >
          <option value="" disabled>
            Select a country
          </option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {declaring && (
        <fieldset className="space-y-4 rounded-xl border border-edge bg-surface p-4">
          <legend className="px-1 text-sm font-medium">Your identity</legend>
          <p className="text-xs text-ink-muted">
            This casino asks for your legal details when you sign up, as shown on your identity
            document.
            {minimumAge !== null && <> You must be at least {minimumAge} years old.</>}
          </p>
          <input type="hidden" name="declare" value="1" />
          <DeclarationFields
            countries={countries}
            defaults={state.values}
            defaultCountryId={countryId || state.values.countryId}
          />
        </fieldset>
      )}

      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}
