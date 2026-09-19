'use client';

import { useActionState, useState } from 'react';
import { checkoutAction } from '@/actions/store';
import { emptyCheckout } from '@/lib/checkout-state';
import type { StorePackage } from '@/lib/webapi';
import { currencyLabel, formatAmount, formatBalance } from '@/lib/money';
import { SubmitButton } from '@/components/SubmitButton';
import { Alert } from '@/components/Alert';
import { OrderWatcher } from './OrderWatcher';

/**
 * The catalogue and the purchase it starts.
 *
 * ONE `useActionState` shared by every card, but a `<form>` PER card: the
 * dispatch is just an action, so several forms can drive the same state, and
 * each card still gets its own `useFormStatus` so only the button that was
 * pressed shows as pending. A single form around the grid would post every
 * package's hidden input at once.
 *
 * Sharing the state is also the honest model of the backend: a player has at
 * most one open order — `store_order.OpenKey` is UNIQUE while pending — so a
 * second package while one is in flight is refused with `checkout-in-progress`.
 */
export function StoreFront({ packages, failed }: { packages: StorePackage[]; failed: boolean }) {
  const [checkout, startCheckout] = useActionState(checkoutAction, emptyCheckout);
  // Which order the player has finished looking at. Keyed by reference rather
  // than a boolean so that starting a SECOND purchase shows its watcher instead
  // of staying dismissed.
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (checkout.redirectUrl && checkout.reference && checkout.reference !== dismissed) {
    const { reference, redirectUrl } = checkout;
    return (
      <OrderWatcher
        reference={reference}
        paymentUrl={redirectUrl}
        onDismiss={() => setDismissed(reference)}
      />
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {checkout.error && <Alert tone="error">{checkout.error}</Alert>}
      {failed && <Alert tone="error">The store could not be loaded right now.</Alert>}

      {!failed && packages.length === 0 && (
        <p className="rounded-xl border border-edge bg-surface px-4 py-6 text-center text-sm text-ink-muted">
          No packages are on sale at the moment.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {packages.map((offer) => (
          <form
            key={offer.Id}
            action={startCheckout}
            className="flex flex-col rounded-xl border border-edge bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{offer.Code}</p>
              {offer.Tag && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                  {offer.Tag}
                </span>
              )}
            </div>

            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {formatAmount(offer.Price, 2)}{' '}
              <span className="text-sm font-normal text-ink-muted">{offer.PriceCurrency}</span>
            </p>

            <ul className="mt-3 flex-1 space-y-1">
              {offer.Items.map((item) => (
                <li key={`${item.Currency}-${item.Kind}`} className="text-sm text-ink-muted">
                  <span className="font-medium text-ink tabular-nums">
                    {formatBalance(item.Amount, item.Currency)}
                  </span>{' '}
                  {currencyLabel(item.Currency)}
                  {item.Kind === 'bonus' && <span className="text-accent"> bonus</span>}
                </li>
              ))}
            </ul>

            {/*
              The ENTIRE body of POST /store/checkout is `{ packageId }`. The
              price, the currency and the player come from the order the backend
              mints; a form that posted a price would be refused outright.
            */}
            <input type="hidden" name="packageId" value={offer.Id} />

            <div className="mt-4">
              <SubmitButton pendingLabel="Starting…" variant="quiet">
                Buy
              </SubmitButton>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
