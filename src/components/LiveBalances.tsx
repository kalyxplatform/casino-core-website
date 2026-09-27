'use client';

import { createContext, useCallback, useContext, useReducer, useRef, useState, type ReactNode } from 'react';
import { refreshBalanceAction } from '@/actions/realtime';
import { applyFeed } from '@/lib/feed';
import { currencyLabel, formatBalance } from '@/lib/money';
import { useLiveChannel, type LiveBalance, type LiveFeedEntry } from '@/lib/useLiveChannel';

/**
 * Every balance on a page, kept live together (backend feature 006, FR-001 – FR-005).
 *
 * One map per page, keyed by currency (compared through `currencyLabel`, as every
 * other currency comparison here): the newest `(committed_at, sequence)` wins, so a
 * late or duplicated event can never move a balance backwards (R5). The strings are
 * stored and shown exactly as received — never parsed, never computed (FR-003).
 *
 * On every channel open the balance is re-read (FR-004). The re-read carries no
 * ordering, so it only fills a currency that no event has touched since the read
 * began — an event that raced ahead of it is newer than what it read.
 *
 * The same channel carries the brand's feed (US2): the provider keeps it too, so a
 * `BetFeed` inside it shares the page's ONE `EventSource` instead of opening a second.
 */
export interface LiveAmounts {
  available_balance: string;
  locked_balance: string;
}

interface Entry extends LiveAmounts {
  ordering: LiveBalance['ordering'] | null;
}

const LiveBalancesContext = createContext<Map<string, Entry> | null>(null);

/** The feed entries of the provider's channel, newest first; `null` outside a provider. */
export const LiveFeedContext = createContext<LiveFeedEntry[] | null>(null);

const newer = (a: LiveBalance['ordering'], b: LiveBalance['ordering'] | null) =>
  b === null || a.committed_at > b.committed_at || (a.committed_at === b.committed_at && a.sequence >= b.sequence);

export function LiveBalancesProvider({ children }: { children: ReactNode }) {
  const [balances, setBalances] = useState<Map<string, Entry>>(() => new Map());
  /** Currencies an event moved since the current re-read began. */
  const touched = useRef<Set<string>>(new Set());

  const reread = useCallback(async () => {
    touched.current = new Set();
    const rows = await refreshBalanceAction();
    if (!rows) return;
    const skip = touched.current;
    setBalances((current) => {
      const next = new Map(current);
      for (const row of rows) {
        const key = currencyLabel(row.currency.code);
        if (skip.has(key)) continue;
        next.set(key, {
          available_balance: row.available_balance,
          locked_balance: row.locked_balance,
          ordering: null,
        });
      }
      return next;
    });
  }, []);

  const apply = useCallback((balance: LiveBalance) => {
    const key = currencyLabel(balance.currency_code);
    touched.current.add(key);
    setBalances((current) => {
      if (!newer(balance.ordering, current.get(key)?.ordering ?? null)) return current;
      const next = new Map(current);
      next.set(key, {
        available_balance: balance.available_balance,
        locked_balance: balance.locked_balance,
        ordering: balance.ordering,
      });
      return next;
    });
  }, []);

  const [feed, dispatchFeed] = useReducer(applyFeed, []);

  useLiveChannel({
    onOpen: () => void reread(),
    onBalance: apply,
    onFeedSnapshot: (entries) => dispatchFeed({ type: 'snapshot', entries }),
    onFeed: (entry) => dispatchFeed({ type: 'entry', entry }),
    onFeedRemoved: (entryIds) => dispatchFeed({ type: 'removed', entryIds }),
  });

  return (
    <LiveBalancesContext.Provider value={balances}>
      <LiveFeedContext.Provider value={feed}>{children}</LiveFeedContext.Provider>
    </LiveBalancesContext.Provider>
  );
}

/**
 * The live amounts for a currency when the channel has any, else the server's —
 * so a page renders the same without a channel as it always did.
 */
export function useLiveAmounts(currencyCode: string, fallback: LiveAmounts): LiveAmounts {
  const live = useContext(LiveBalancesContext)?.get(currencyLabel(currencyCode));
  return live ?? fallback;
}

/** An account's available balance, formatted, live when the channel has it. */
export function LiveAvailable({
  account,
}: {
  account: { available_balance: string; locked_balance: string; currency: { code: string } };
}) {
  const amounts = useLiveAmounts(account.currency.code, account);
  return <>{formatBalance(amounts.available_balance, account.currency.code)}</>;
}
