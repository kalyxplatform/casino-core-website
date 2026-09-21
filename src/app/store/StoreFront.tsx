'use client';

import { useActionState, useEffect } from 'react';
import { checkoutAction } from '@/actions/store';
import { emptyCheckout } from '@/lib/checkout-state';
import type { StorePackage } from '@/lib/webapi';
import { currencyLabel, formatAmount, formatBalance } from '@/lib/money';
import { SubmitButton } from '@/components/SubmitButton';
import { Alert } from '@/components/Alert';

/**
 * The catalogue, and the purchase it starts.
 *
 * ONE `useActionState` shared by every card, but a `<form>` PER card: the dispatch is just
 * an action, so several forms can drive the same state, and each card still gets its own
 * `useFormStatus` so only the button that was pressed shows as pending. A single form
 * around the grid would post every package's hidden input at once.
 *
 * Sharing the state is also the honest model of the backend: a player has at most one open
 * order — `store_order.OpenKey` is UNIQUE while pending — so a second package while one is
 * in flight is refused with `checkout-in-progress`.
 *
 * ## Why this navigates the whole page away
 *
 * The provider's page is not ours and must not be framed. We send the browser to it
 * full-page and it sends the player back to `/store/return?ref=…` on this site, built by
 * the backend from the brand's `WebsiteUrl`. So the purchase is an ordinary round trip
 * and there is nothing to watch from here — the return page reports the outcome.
 */
export function StoreFront({ packages, failed }: { packages: StorePackage[]; failed: boolean }) {
  const [checkout, startCheckout] = useActionState(checkoutAction, emptyCheckout);

  // A full-page navigation, not `router.push`: the target is a different origin.
  useEffect(() => {
    if (checkout.redirectUrl) window.location.href = checkout.redirectUrl;
  }, [checkout.redirectUrl]);

  if (checkout.redirectUrl) {
    return (
      <div className="mt-5 space-y-3 rounded-xl border border-edge bg-surface p-5">
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="inline-block size-2 animate-pulse rounded-full bg-accent" />
          Taking you to the payment page…
        </p>
        {/* If the browser blocked the navigation, the player is not stuck. */}
        <a
          href={checkout.redirectUrl}
          className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110"
        >
          Continue to payment
        </a>
      </div>
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
            key={offer.id}
            action={startCheckout}
            className="flex flex-col rounded-xl border border-edge bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{offer.code}</p>
              {offer.tag && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                  {offer.tag}
                </span>
              )}
            </div>

            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {formatAmount(offer.price, 2)}{' '}
              <span className="text-sm font-normal text-ink-muted">{offer.price_currency}</span>
            </p>

            <ul className="mt-3 flex-1 space-y-1">
              {offer.items.map((item) => (
                <li key={`${item.currency}-${item.kind}`} className="text-sm text-ink-muted">
                  <span className="font-medium text-ink tabular-nums">
                    {formatBalance(item.amount, item.currency)}
                  </span>{' '}
                  {currencyLabel(item.currency)}
                  {item.kind === 'bonus' && <span className="text-accent"> bonus</span>}
                </li>
              ))}
            </ul>

            {/*
              The ENTIRE body of POST /store/checkout is `{ package_id }`. The price, the
              currency and the player come from the order the backend mints; a form that
              posted a price would be refused outright. This field name is the FORM's, not
              the wire's — `checkoutAction` is what names the one property the body has.
            */}
            <input type="hidden" name="packageId" value={offer.id} />

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
