import Link from 'next/link';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';
import { LoginForm } from './LoginForm';

export default async function LoginPage(props: PageProps<'/login'>) {
  if (await readSession()) redirect('/account');
  const { registered, expired } = await props.searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Player area for <span className="text-ink">casino-core</span>.
      </p>

      <LoginForm registered={registered === '1'} expired={expired === '1'} />

      <p className="mt-6 text-sm text-ink-muted">
        No account yet?{' '}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
