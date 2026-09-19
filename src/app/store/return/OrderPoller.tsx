'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { readOrderStatus } from '@/actions/store';

/**
 * Waits for an order that is still `pending` when the player lands back here.
 *
 * Arriving on this page proves nothing about the payment: the provider's redirect is not
 * what credits an order — its signed server-to-server notification is, and that races the
 * browser. Usually it wins; when it does not, this polls until the platform has actually
 * recorded an outcome, then re-renders the page from the server.
 *
 * It only exists for the `pending` case. Once the order is settled the page is static and
 * this component is not rendered at all.
 */
const POLL_INTERVAL_MS = 2_000;
/** Orders expire in 30 minutes; there is nothing to learn by asking past that. */
const POLL_LIMIT = 900;

export function OrderPoller({ reference }: { reference: string }) {
  const router = useRouter();

  useEffect(() => {
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
      // The order and the balance both live in Server Components above this one.
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reference, router]);

  return (
    <p className="flex items-center gap-2 text-sm text-ink-muted">
      <span className="inline-block size-2 animate-pulse rounded-full bg-accent" />
      Confirming your payment…
    </p>
  );
}
