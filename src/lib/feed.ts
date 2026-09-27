import type { LiveFeedEntry } from '@/lib/useLiveChannel';

/**
 * The "Latest" feed's state rules (backend feature 006, FR-030 – FR-036), kept apart
 * from the component so they can be tested without a DOM.
 *
 * - A snapshot REPLACES the list (every channel open sends one — the recent list is
 *   the authority after a reopen).
 * - A live entry is PREPENDED, unless its `entry_id` is already shown (design M16:
 *   the snapshot and a live frame can carry the same entry around a reopen).
 * - A removal drops every listed id (a reversed round).
 * - Never more than the backend keeps: 50, newest first. The tabs SHOW at most 20
 *   (FR-034); the state keeps 50 so "Winners" filters all of them.
 *
 * The component never filters on amount: the listener already drops a zero-amount
 * entry, and a second rule here would drift from the first.
 */
export const FEED_LENGTH = 50;
/** What a tab shows (FR-034): the newest 20 — of all kept for "Latest", of the wins for "Winners". */
export const FEED_SHOWN = 20;

export type FeedAction =
  | { type: 'snapshot'; entries: LiveFeedEntry[] }
  | { type: 'entry'; entry: LiveFeedEntry }
  | { type: 'removed'; entryIds: string[] };

export function applyFeed(state: LiveFeedEntry[], action: FeedAction): LiveFeedEntry[] {
  switch (action.type) {
    case 'snapshot': {
      const seen = new Set<string>();
      const next: LiveFeedEntry[] = [];
      for (const entry of action.entries) {
        if (seen.has(entry.entry_id)) continue;
        seen.add(entry.entry_id);
        next.push(entry);
        if (next.length === FEED_LENGTH) break;
      }
      return next;
    }
    case 'entry':
      if (state.some((entry) => entry.entry_id === action.entry.entry_id)) return state;
      return [action.entry, ...state].slice(0, FEED_LENGTH);
    case 'removed': {
      const gone = new Set(action.entryIds);
      const next = state.filter((entry) => !gone.has(entry.entry_id));
      return next.length === state.length ? state : next;
    }
  }
}

/** "just now", "42 s ago", "3 min ago", "2 h ago" — from the entry's `at` (ms). */
export function relativeTime(at: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - at) / 1_000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}
