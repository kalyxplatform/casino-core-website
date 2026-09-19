'use client';

import { useActionState } from 'react';
import { loginAction, type FormState } from '@/actions/auth';
import { SubmitButton } from '@/components/SubmitButton';
import { Alert } from '@/components/Alert';

const initialState: FormState = { error: null };

export function LoginForm({ registered }: { registered: boolean }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {registered && <Alert tone="info">Your account was created. Sign in to continue.</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="space-y-1.5">
        <label htmlFor="identifier" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="identifier"
          name="identifier"
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
          autoComplete="current-password"
          required
          className="field"
        />
      </div>

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
