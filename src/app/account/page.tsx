import { Suspense } from 'react';
import Link from 'next/link';
import { redirectToExpiredSession, requireSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { AppShell } from '@/components/AppShell';
import { BalancePanel } from '@/components/BalancePanel';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';

/**
 * Profile and balance.
 *
 * The profile is the `user` block the login response carried, held in the session
 * cookie: `GET /user` is still a stub that answers a bare string, so there is
 * nothing else to read it from yet. That means the profile costs no network at all,
 * and it is why it renders outside the `<Suspense>` below — it is ready the moment
 * the request reaches the function, and waiting for a balance to show it would be
 * waiting for nothing.
 *
 * The balance IS a network call, to `us-central1` from a function in `iad1`, so it
 * streams: the shell and the profile flush first and the panel arrives after.
 */
export default async function AccountPage() {
  const session = await requireSession();

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
        <Suspense fallback={<BalanceFallback />}>
          <Balance token={session.token} />
        </Suspense>
      </div>
    </AppShell>
  );
}

/**
 * The balance, fetched on every render and never cached.
 *
 * A `403` here is the backend saying the session is gone — a JWT that has not
 * expired is still refused once its `web_session` row is, so the two are checked
 * independently and holding a cookie proves nothing. The cookie has to be dropped,
 * and a page render cannot drop one (`cookies()` is mutable only in the action
 * phase), so this hands off to the Route Handler that can.
 */
async function Balance({ token }: { token: string }) {
  const balance = await webapi.getBalance(token);

  if (balance.code === ResponderCodes.FORBIDDEN) redirectToExpiredSession();

  if (balance.code !== ResponderCodes.SUCCESS || !balance.data) {
    return <p className="text-sm text-danger">Your balance could not be loaded right now.</p>;
  }

  return <BalancePanel balances={balance.data} />;
}

function BalanceFallback() {
  return (
    <SkeletonRegion label="Loading your balance">
      <div className="grid gap-3 sm:grid-cols-2">
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
      </div>
    </SkeletonRegion>
  );
}
