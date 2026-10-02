import Link from 'next/link';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { requirementsFrom } from '@/lib/verification';
import { RegisterForm } from './RegisterForm';

/**
 * `country_id` is REQUIRED by `RegisterRequestDto` and there is no IP-geolocation
 * fallback any more — it was removed deliberately, so the form must always
 * offer a real choice rather than guessing one.
 *
 * Backend feature 007: the brand's verification policy shapes the form. The public
 * requirements route says whether the declared-identity fields are required and
 * the minimum age; it is read beside the country list, and anything but a readable
 * answer (a backend without the route answers 404) is the plain form —
 * `POST /registration` is the authority and reopens the form if it disagrees.
 */
export default async function RegisterPage() {
  if (await readSession()) redirect('/account');

  const [countries, requirements] = await Promise.all([
    webapi.listCountries(),
    webapi.getRegistrationRequirements(),
  ]);
  const options =
    countries.code === ResponderCodes.SUCCESS && countries.data ? countries.data : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-1 text-sm text-ink-muted">Takes a few seconds. No real money is involved.</p>

      <RegisterForm countries={options} requirements={requirementsFrom(requirements)} />

      <p className="mt-6 text-sm text-ink-muted">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
