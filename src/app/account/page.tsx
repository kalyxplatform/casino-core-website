import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession, clearSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { AppShell } from '@/components/AppShell';
import { BalancePanel } from '@/components/BalancePanel';

/**
 * Profile and balance.
 *
 * The profile is the `user` block the login response carried, held in the
 * session cookie: `GET /user` is still a stub that answers a bare string, so
 * there is nothing else to read it from yet.
 *
 * The balance is fetched on every render and never cached. A `403` here is the
 * backend telling us the session is gone — a JWT that has not expired is still
 * refused once its `web_session` row is — so the cookie is dropped and the
 * player is sent to sign in again, rather than shown a stale page.
 */
export default async function AccountPage() {
  const session = await requireSession();
  const balance = await webapi.getBalance(session.token);

  if (balance.code === ResponderCodes.FORBIDDEN) {
    await clearSession();
    redirect('/login');
  }

  const rows = [
    ['Player id', String(session.player.user_id)],
    ['Email', session.player.email],
    ['Status', session.player.status],
    ['Brand id', String(session.player.brand_id)],
    ['Country id', String(session.player.country_id)],
  ];

  return (
    <AppShell player={session.player} current="account">
      <h1 className="text-xl font-semibold tracking-tight">Profile</h1>

      <dl className="mt-4 divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Balance</h2>
        <Link href="/store" className="text-sm font-medium text-accent hover:underline">
          Get coins
        </Link>
      </div>

      <div className="mt-4">
        {balance.code === ResponderCodes.SUCCESS && balance.data ? (
          <BalancePanel balances={balance.data} />
        ) : (
          <p className="text-sm text-danger">Your balance could not be loaded right now.</p>
        )}
      </div>
    </AppShell>
  );
}
