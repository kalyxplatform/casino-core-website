/**
 * Compact display for large numbers: 1.2M / 250K / 6,800.
 *
 * Used for Gold Coin balances, XP values, package sizes.
 * Defaults: 1 fractional digit for M, 0 for K, locale string under 1K.
 */
export function fmtCompact(
  n: number,
  opts: { mDigits?: number; kDigits?: number } = {},
): string {
  const mDigits = opts.mDigits ?? 1;
  const kDigits = opts.kDigits ?? 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(mDigits) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(kDigits) + "K";
  return n.toLocaleString();
}

/** Sweep Coin display — always 2 decimals (e.g. "12.50"). */
export function fmtSC(n: number): string {
  return n.toFixed(2);
}
