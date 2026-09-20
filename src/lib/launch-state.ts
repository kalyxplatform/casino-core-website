/**
 * What `launchAction` hands back, and its "nothing has been launched yet" value.
 *
 * It lives here rather than beside the action for the reason `checkout-state.ts`
 * does: a `'use server'` module may export ONLY async functions, and a constant
 * exported from one throws when the module is evaluated — which `next build`
 * does not catch for a dynamic page, so the build passes and the page 500s.
 */
export interface LaunchState {
  error: string | null;
  /**
   * Revolver's launch address, for the player's own browser and nothing else.
   *
   * It contains a live single-use session token, so it is never logged, never
   * cached and never put in an address bar — it goes straight into the frame.
   */
  url: string | null;
  /** Which game this address opens, so the frame can be labelled without a lookup. */
  gameCode: string | null;
  currencyCode: string | null;
}

export const emptyLaunch: LaunchState = {
  error: null,
  url: null,
  gameCode: null,
  currencyCode: null,
};
