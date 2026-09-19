import Link from 'next/link';
import { redirect } from 'next/navigation';
import { clearSession, requireSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { AppShell } from '@/components/AppShell';
import { currencyLabel, formatAmount, formatBalance } from '@/lib/money';
import { Alert } from '@/components/Alert';

/**
 * Where a payment provider sends the player back to.
 *
 * `CheckoutService` builds this address itself, as
 * `https://<brand hostname>/store/return?ref=<reference>` — from the brand's
 * STORED hostname, never the `Host` a request arrived on. In the development
 * environment that hostname is the API's own, so the sandbox's redirect lands
 * on the API and not here; the store page watches the order instead. This page
 * is still the right shape for that address, and it is what a player reaches by
 * following the link with this site's host in front of it.
 *
 * Landing here proves nothing about the payment: the provider's redirect is not
 * what credits an order — its signed server-to-server notification is. So this
 * reads the order and reports what the platform actually recorded.
 */
const OUTCOMES: Record<string, { tone: 'error' | 'info'; message: string }> = {
  credited: { tone: 'info', message: 'Payment received. Your coins have been added.' },
  pending: { tone: 'error', message: 'This payment has not completed yet.' },
  failed: { tone: 'error', message: 'The payment failed. Nothing was charged.' },
  expired: { tone: 'error', message: 'This order expired before it was paid.' },
  refunded: { tone: 'error', message: 'This order was refunded.' },
  disputed: { tone: 'error', message: 'This order is disputed. Support will be in touch.' },
  review: { tone: 'error', message: 'This payment is being reviewed. It will settle shortly.' },
};

export default async function StoreReturnPage(props: PageProps<'/store/return'>) {
  const session = await requireSession();
  const { ref, cancelled } = await props.searchParams;

  const reference = typeof ref === 'string' ? ref : '';
  const order = reference ? await webapi.readOrder(session.token, reference) : null;

  if (order?.code === ResponderCodes.FORBIDDEN) {
    await clearSession();
    redirect('/login');
  }

  const found = order?.code === ResponderCodes.SUCCESS ? order.data : undefined;
  const outcome = found ? OUTCOMES[found.Status] : undefined;

  return (
    <AppShell player={session.player} current="store">
      <h1 className="text-xl font-semibold tracking-tight">Purchase</h1>

      <div className="mt-4 space-y-4 rounded-xl border border-edge bg-surface p-5">
        {cancelled === '1' && <Alert tone="error">You cancelled the payment.</Alert>}

        {!found && <Alert tone="error">That order could not be found.</Alert>}

        {found && outcome && <Alert tone={outcome.tone}>{outcome.message}</Alert>}

        {found && (
          <>
            <dl className="divide-y divide-edge text-sm">
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-ink-muted">Package</dt>
                <dd className="font-medium">{found.PackageCode}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-ink-muted">Price</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(found.Price, 2)} {found.PriceCurrency}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-ink-muted">Status</dt>
                <dd className="font-medium">{found.Status}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-ink-muted">Reference</dt>
                <dd className="font-mono text-xs">{found.Reference}</dd>
              </div>
            </dl>

            <ul className="space-y-1">
              {found.Items.map((item) => (
                <li key={`${item.Currency}-${item.Kind}`} className="text-sm text-ink-muted">
                  <span className="font-medium text-ink tabular-nums">
                    {formatBalance(item.Amount, item.Currency)}
                  </span>{' '}
                  {currencyLabel(item.Currency)}
                  {item.Kind === 'bonus' && <span className="text-accent"> bonus</span>}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex gap-3">
          <Link
            href="/account"
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-center text-sm font-semibold text-accent-ink"
          >
            View balance
          </Link>
          <Link
            href="/store"
            className="flex-1 rounded-lg border border-edge px-4 py-2 text-center text-sm text-ink-muted"
          >
            Back to store
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
