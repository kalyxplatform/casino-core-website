'use client';

import { useActionState } from 'react';
import { registerAction, type FormState } from '@/actions/auth';
import type { CountryOption } from '@/lib/webapi';
import { SubmitButton } from '@/components/SubmitButton';
import { Alert } from '@/components/Alert';

const initialState: FormState = { error: null };

export function RegisterForm({ countries }: { countries: CountryOption[] }) {
  const [state, formAction] = useActionState(registerAction, initialState);

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
        <select id="countryId" name="countryId" required defaultValue="" className="field">
          <option value="" disabled>
            Select a country
          </option>
          {countries.map((country) => (
            <option key={country.Id} value={country.Id}>
              {country.Name}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}
