'use client';

import { useContext, useEffect, useReducer, useState } from 'react';
import { LiveFeedContext } from '@/components/LiveBalances';
import { applyFeed, FEED_SHOWN, relativeTime } from '@/lib/feed';
import { currencyLabel, formatBalance } from '@/lib/money';
import { useLiveChannel, type LiveFeedEntry } from '@/lib/useLiveChannel';

/**
 * The brand's latest bets and wins (backend feature 006, US2 + US3 — FR-030 – FR-037).
 * Two tabs over one list: "Latest" and "Winners" (the same entries, wins only).
 *
 * Inside a `LiveBalancesProvider` (`/games`, `/account`) it reads the provider's
 * feed, so the page keeps ONE live channel. Outside one (`/login`, signed out) it
 * opens its own: the relay sees no session and opens `webapi`'s anonymous feed
 * stream, which never carries a balance.
 *
 * Every row is what the backend chose to show — a masked label, the game's name,
 * the amount as a string — and nothing identifies the player further (FR-032).
 * Amounts are formatted, never computed (FR-037). No channel, or no rows yet, is a
 * quiet placeholder, never an error (FR-035).
 */
export function BetFeed() {
  const shared = useContext(LiveFeedContext);
  return shared === null ? <OwnChannelFeed /> : <FeedPanel entries={shared} />;
}

function OwnChannelFeed() {
  const [entries, dispatch] = useReducer(applyFeed, []);
  useLiveChannel({
    onFeedSnapshot: (snapshot) => dispatch({ type: 'snapshot', entries: snapshot }),
    onFeed: (entry) => dispatch({ type: 'entry', entry }),
    onFeedRemoved: (entryIds) => dispatch({ type: 'removed', entryIds }),
  });
  return <FeedPanel entries={entries} />;
}

/** Re-renders the relative times now and then; nothing here needs a second's precision. */
function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

type FeedTab = 'latest' | 'winners';

const TABS: { id: FeedTab; label: string; empty: string }[] = [
  { id: 'latest', label: 'Latest', empty: 'No bets yet.' },
  { id: 'winners', label: 'Winners', empty: 'No wins yet.' },
];

/**
 * The rows a tab shows (FR-034). "Latest" is the newest {@link FEED_SHOWN} of the
 * 50 kept (`FEED_LENGTH`); "Winners" filters ALL kept to wins, then shows at most
 * {@link FEED_SHOWN} — fewer when fewer exist (A-004). No filter on amount: the
 * listener already drops a zero amount.
 */
function rowsOf(entries: LiveFeedEntry[], tab: FeedTab): LiveFeedEntry[] {
  const pool = tab === 'winners' ? entries.filter((entry) => entry.kind === 'win') : entries;
  return pool.slice(0, FEED_SHOWN);
}

function FeedPanel({ entries }: { entries: LiveFeedEntry[] }) {
  const now = useNow();
  const [tab, setTab] = useState<FeedTab>('latest');
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const rows = rowsOf(entries, tab);
  return (
    <section aria-labelledby="bet-feed-heading" className="rounded-xl border border-edge bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-edge px-4 py-3">
        <h2 id="bet-feed-heading" className="text-sm font-semibold tracking-tight">
          Live activity
        </h2>
        <div role="tablist" aria-label="Feed" className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`bet-feed-tab-${t.id}`}
              aria-selected={t.id === tab}
              aria-controls="bet-feed-panel"
              onClick={() => setTab(t.id)}
              className={
                t.id === tab
                  ? 'rounded-md bg-surface-raised px-2.5 py-1 text-xs font-medium text-ink'
                  : 'rounded-md px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id="bet-feed-panel" aria-labelledby={`bet-feed-tab-${tab}`}>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">{active.empty}</p>
        ) : (
          <ul className="divide-y divide-edge">
            {rows.map((entry) => (
              <FeedRow key={entry.entry_id} entry={entry} now={now} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FeedRow({ entry, now }: { entry: LiveFeedEntry; now: number }) {
  const win = entry.kind === 'win';
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <span
        className={
          win
            ? 'rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent'
            : 'rounded bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted'
        }
      >
        {win ? 'Win' : 'Bet'}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{entry.label}</span>
        <span className="text-ink-muted"> · {entry.game_name}</span>
      </span>
      <span className={`tabular-nums ${win ? 'text-accent' : ''}`}>
        {formatBalance(entry.amount, entry.currency_code)} {currencyLabel(entry.currency_code)}
      </span>
      <time
        dateTime={new Date(entry.at).toISOString()}
        className="w-20 shrink-0 text-right text-xs text-ink-muted tabular-nums"
      >
        {relativeTime(entry.at, now)}
      </time>
    </li>
  );
}
