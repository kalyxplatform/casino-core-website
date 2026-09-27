'use client';

import type { AccountBalance } from '@/lib/webapi';
import { currencyLabel, formatBalance } from '@/lib/money';
import { useLiveAmounts } from '@/components/LiveBalances';

/**
 * In social mode a player has one account per social currency — GC (Gold Coins)
 * and SC (Sweeps Coins). These are coins, never dollars, and the amounts are
 * rendered from the strings the API sent without any arithmetic.
 *
 * Inside a `LiveBalancesProvider` each card follows the live channel (backend
 * feature 006); outside one it shows the server's amounts, as it always did.
 */
export function BalancePanel({ balances }: { balances: AccountBalance[] }) {
  if (balances.length === 0) {
    return <p className="text-sm text-ink-muted">No accounts yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {balances.map((account) => (
        <BalanceCard key={account.id} account={account} />
      ))}
    </div>
  );
}

function BalanceCard({ account }: { account: AccountBalance }) {
  const amounts = useLiveAmounts(account.currency.code, account);
  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        {currencyLabel(account.currency.code)}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {formatBalance(amounts.available_balance, account.currency.code)}
      </p>
      {/*
        Locked balance is what a game has reserved but not yet settled. It
        is only worth a line when it is not zero — a row of "0.00 locked"
        on every account is noise.
      */}
      {!/^0*\.?0*$/.test(amounts.locked_balance) && (
        <p className="mt-1 text-xs text-ink-muted tabular-nums">
          {formatBalance(amounts.locked_balance, account.currency.code)} locked
        </p>
      )}
    </div>
  );
}
