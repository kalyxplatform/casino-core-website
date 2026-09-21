/**
 * Money is a STRING from the API to the screen, and it is never a `number` on
 * the way.
 *
 * `account.available_balance` is `decimal(65,30)` and arrives as
 * `"100000.000000000000000000000000000000"`. `parseFloat` on that is a silent
 * precision loss, and the backend's own rule ("every DECIMAL column is a
 * `string` in TypeScript — never retype one to `number`") applies just as much
 * on this side of the wire. So these helpers slice and pad text; no arithmetic
 * happens here, and none should. The server is the source of truth for every
 * amount shown.
 */

/** Split a decimal string into its sign, integer and fraction parts. */
function parts(raw: string): { sign: string; whole: string; fraction: string } {
  const trimmed = raw.trim();
  const sign = trimmed.startsWith('-') ? '-' : '';
  const unsigned = sign ? trimmed.slice(1) : trimmed;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  return { sign, whole: whole === '' ? '0' : whole, fraction };
}

const group = (whole: string): string => whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * A decimal string for display, truncated (never rounded) to `decimals`.
 *
 * Truncating is the honest choice for a balance: rounding 0.999 up to 1.00
 * would show a player money they do not have.
 */
export function formatAmount(raw: string, decimals: number): string {
  if (!/^-?\d*\.?\d*$/.test(raw.trim()) || raw.trim() === '') return raw;
  const { sign, whole, fraction } = parts(raw);
  if (decimals === 0) return `${sign}${group(whole)}`;
  return `${sign}${group(whole)}.${fraction.slice(0, decimals).padEnd(decimals, '0')}`;
}

/**
 * How many decimals a currency is shown with.
 *
 * Social coins and fiat are both 2. Crypto would be up to 8 — this table is
 * where that goes when a crypto currency exists, rather than a guess at the
 * call site.
 *
 * It is keyed on the NORMALISED code, because the backend's own contract
 * fixtures spell the seeded social currencies both ways: `balance-success.json`
 * says `GC`, while `store-packages-success.json` and `games-launch-request.json`
 * say `GC.`. Whichever the environment actually holds, a gold coin must not fall
 * through to two decimals — so the dot is stripped before the lookup rather than
 * being part of the key.
 */
const DECIMALS: Record<string, number> = { GC: 0, SC: 2, USD: 2 };

/**
 * A currency code without the backend's trailing dot — `GC.` reads badly in a
 * sentence, and the dot is an artefact of the seed data rather than part of the
 * currency's name. Also the one way to compare two codes for the same currency.
 */
export const currencyLabel = (code: string): string => code.replace(/\.$/, '');

export const formatBalance = (raw: string, currencyCode: string): string =>
  formatAmount(raw, DECIMALS[currencyLabel(currencyCode)] ?? 2);
