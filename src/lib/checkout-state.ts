/**
 * The shape `checkoutAction` returns, and its "nothing has happened yet" value.
 *
 * These live here rather than beside the action because a `'use server'` module
 * may export ONLY async functions — a constant exported from one is a runtime
 * error at module evaluation, which `next build` does not catch for a dynamic
 * page. Types alone would have been fine (they are erased), but the initial
 * state is a real object, so both moved together to keep them in one place.
 */
import type { VerificationHint } from './verification';

export interface CheckoutState {
  error: string | null;
  /** Set when the checkout was refused for verification (backend feature 007). */
  verification: VerificationHint | null;
  /** The hosted payment page to send the player to, once there is one. */
  redirectUrl: string | null;
  reference: string | null;
}

export const emptyCheckout: CheckoutState = {
  error: null,
  verification: null,
  redirectUrl: null,
  reference: null,
};
