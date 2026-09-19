'use server';

import { redirect } from 'next/navigation';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { readSession } from '@/lib/session';
import { emptyCheckout, type CheckoutState } from '@/lib/checkout-state';

/**
 * The messages `POST /store/checkout` answers with are slugs meant for a
 * developer (`checkout-in-progress`, `too-many-attempts`), not sentences meant
 * for a player. Mapping them here is the repo's "never display a raw error
 * message from the API" rule, and it is also what keeps `not-found` from
 * telling a player whether a package exists — the backend answers one
 * indistinguishable `404` for absent, disabled, malformed and another brand's.
 */
const CHECKOUT_ERRORS: Record<string, string> = {
  'checkout-in-progress': 'You already have a purchase in progress. Finish or cancel it first.',
  'too-many-attempts': 'Too many purchase attempts. Wait a moment and try again.',
  'not-found': 'That package is not available.',
  'checkout-unavailable': 'Payments are temporarily unavailable. Try again shortly.',
};

export async function checkoutAction(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const session = await readSession();
  if (!session) redirect('/login');

  const packageId = Number(formData.get('packageId'));
  if (!Number.isInteger(packageId) || packageId < 1) {
    return { ...emptyCheckout, error: 'That package is not available.' };
  }

  const checkout = await webapi.startCheckout(session.token, packageId);

  if (checkout.code === ResponderCodes.FORBIDDEN) redirect('/login');

  if (checkout.code !== ResponderCodes.SUCCESS || !checkout.data) {
    const slug = checkout.message ?? '';
    return {
      ...emptyCheckout,
      error: CHECKOUT_ERRORS[slug] ?? 'The purchase could not be started. Try again shortly.',
    };
  }

  return {
    error: null,
    redirectUrl: checkout.data.RedirectUrl,
    reference: checkout.data.Reference,
  };
}

/** One poll of an order, for the page watching a payment complete. */
export async function readOrderStatus(
  reference: string,
): Promise<{ status: string | null; creditedAt: string | null }> {
  const session = await readSession();
  if (!session) return { status: null, creditedAt: null };

  const order = await webapi.readOrder(session.token, reference);
  if (order.code !== ResponderCodes.SUCCESS || !order.data) {
    return { status: null, creditedAt: null };
  }
  return { status: order.data.Status, creditedAt: order.data.CreditedAt };
}
