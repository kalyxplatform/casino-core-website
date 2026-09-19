import { redirect } from 'next/navigation';
import { clearSession, requireSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { AppShell } from '@/components/AppShell';
import { BalancePanel } from '@/components/BalancePanel';
import { StoreFront } from './StoreFront';

/**
 * The package catalogue.
 *
 * `GET /store/packages` is NOT public — it answers for a signed-in player of
 * the resolved brand and nobody else — and it is never cached on either side:
 * a disabled or re-priced package takes effect on the next request.
 *
 * An empty list is a legitimate answer, not an error. A package disappears from
 * it for any of several reasons (disabled, price currency disabled, a malformed
 * line), and the API deliberately does not say which.
 */
export default async function StorePage() {
  const session = await requireSession();

  const [packages, balance] = await Promise.all([
    webapi.listPackages(session.token),
    webapi.getBalance(session.token),
  ]);

  if (packages.code === ResponderCodes.FORBIDDEN || balance.code === ResponderCodes.FORBIDDEN) {
    await clearSession();
    redirect('/login');
  }

  return (
    <AppShell player={session.player} current="store">
      <h1 className="text-xl font-semibold tracking-tight">Balance</h1>
      <div className="mt-4">
        {balance.code === ResponderCodes.SUCCESS && balance.data ? (
          <BalancePanel balances={balance.data} />
        ) : (
          <p className="text-sm text-danger">Your balance could not be loaded right now.</p>
        )}
      </div>

      <h2 className="mt-8 text-xl font-semibold tracking-tight">Get coins</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Payment runs against the sandbox provider. No real money is taken.
      </p>

      <StoreFront
        packages={
          packages.code === ResponderCodes.SUCCESS && packages.data ? packages.data : []
        }
        failed={packages.code !== ResponderCodes.SUCCESS}
      />
    </AppShell>
  );
}
