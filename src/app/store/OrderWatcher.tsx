'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readOrderStatus } from '@/actions/store';
import { Alert } from '@/components/Alert';

/**
 * Watches one order while the player pays for it somewhere else.
 *
 * ## Why the payment page opens in a new tab
 *
 * The provider's page is not ours and we cannot frame it (`frame-ancestors
 * 'self'`). When it is done it redirects to a return address the BACKEND built,
 * from the brand's stored hostname — and in this environment that hostname is
 * the API's own, so the player would land on the API rather than back here.
 * Opening the payment page in a second tab keeps this one alive to report the
 * outcome, and the outcome is authoritative either way: pressing "pay" does not
 * credit anything, it makes the provider send a signed notification, and only
 * that notification credits. So polling the order is the correct thing to watch
 * — not the tab the player was in.
 *
 * The link is an ordinary anchor the player clicks rather than a `window.open`
 * after the action resolves, because a popup opened outside a user gesture is
 * what browsers block.
 */
const POLL_INTERVAL_MS = 2_000;
/** Orders expire in 30 minutes; there is nothing to learn by polling past that. */
const POLL_LIMIT = 900;

const TERMINAL: Record<string, { tone: 'error' | 'info'; message: string }> = {
  credited: { tone: 'info', message: 'Payment received. Your coins have been added.' },
  failed: { tone: 'error', message: 'The payment failed. Nothing was charged.' },
  expired: { tone: 'error', message: 'This order expired before it was paid.' },
  refunded: { tone: 'error', message: 'This order was refunded.' },
  disputed: { tone: 'error', message: 'This order is disputed. Support will be in touch.' },
  review: { tone: 'error', message: 'This payment is being reviewed. It will settle shortly.' },
};

export function OrderWatcher({
  reference,
  paymentUrl,
  onDismiss,
}: {
  reference: string;
  paymentUrl: string;
  /** Hands the catalogue back. The action state still holds this order, so the
   *  parent has to be told the player is done with it — a `router.refresh()`
   *  re-runs the server render but leaves client state exactly where it was. */
  onDismiss: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    if (status !== 'pending') return;

    let cancelled = false;
    let polls = 0;

    const timer = setInterval(async () => {
      if (polls++ >= POLL_LIMIT) {
        clearInterval(timer);
        return;
      }
      const order = await readOrderStatus(reference);
      if (cancelled || !order.status || order.status === 'pending') return;

      clearInterval(timer);
      setStatus(order.status);
      // Balances live in a Server Component, so a refresh is what re-reads them.
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reference, status, router]);

  const settled = TERMINAL[status];

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-edge bg-surface p-5">
      <div>
        <h3 className="text-sm font-semibold">Order {reference.slice(0, 8)}…</h3>
        <p className="mt-1 text-xs text-ink-muted">Reference {reference}</p>
      </div>

      {settled ? (
        <Alert tone={settled.tone}>{settled.message}</Alert>
      ) : (
        <>
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110"
          >
            Open payment page
          </a>
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="inline-block size-2 animate-pulse rounded-full bg-accent" />
            Waiting for payment…
          </p>
          <p className="text-xs text-ink-muted">
            The payment page opens in a new tab. Pay there, then come back here — this page
            updates on its own. You can close the payment tab wherever it ends up.
          </p>
        </>
      )}

      <button
        type="button"
        onClick={settled ? onDismiss : () => router.refresh()}
        className="w-full rounded-lg border border-edge px-4 py-2 text-sm text-ink-muted transition hover:border-ink-muted hover:text-ink"
      >
        {settled ? 'Back to the store' : 'Refresh'}
      </button>
    </div>
  );
}
