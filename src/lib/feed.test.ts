import { describe, expect, it } from 'vitest';
import { applyFeed, FEED_LENGTH, FEED_SHOWN } from '@/lib/feed';
import type { LiveFeedEntry } from '@/lib/useLiveChannel';

// Backend feature 006, T063 (SR-M3, FR-030 – FR-036, design M16) — the feed reducer.

const entry = (id: string, kind: 'bet' | 'win' = 'bet', at = 0): LiveFeedEntry => ({
  entry_id: id,
  kind,
  game_name: 'Book of Tests',
  label: `player-${id}`,
  amount: '1',
  currency_code: 'SC',
  at,
});
const ids = (state: LiveFeedEntry[]) => state.map((e) => e.entry_id);

describe('applyFeed', () => {
  it('a feed_snapshot REPLACES the state and de-duplicates on entry_id (first wins)', () => {
    const before = [entry('old-1'), entry('old-2')];
    const next = applyFeed(before, {
      type: 'snapshot',
      entries: [entry('a'), entry('b'), entry('a', 'win'), entry('c')],
    });
    expect(ids(next)).toEqual(['a', 'b', 'c']);
    expect(next[0].kind).toBe('bet');
  });

  it('an empty snapshot empties the state', () => {
    expect(applyFeed([entry('x')], { type: 'snapshot', entries: [] })).toEqual([]);
  });

  it('a live feed entry is PREPENDED', () => {
    const next = applyFeed([entry('b'), entry('a')], { type: 'entry', entry: entry('c') });
    expect(ids(next)).toEqual(['c', 'b', 'a']);
  });

  it('a live entry already held is ignored — the same state object, nothing re-renders (M16)', () => {
    const state = [entry('b'), entry('a')];
    const next = applyFeed(state, { type: 'entry', entry: entry('a', 'win') });
    expect(next).toBe(state);
  });

  it('feed_removed drops every listed id, and an unknown id changes nothing', () => {
    const state = [entry('d'), entry('c'), entry('b'), entry('a')];
    expect(ids(applyFeed(state, { type: 'removed', entryIds: ['c', 'a'] }))).toEqual(['d', 'b']);
    expect(applyFeed(state, { type: 'removed', entryIds: ['zz'] })).toBe(state);
  });

  it('the state is capped at 50 — a snapshot of 60 keeps the newest 50, a live entry drops the oldest', () => {
    expect(FEED_LENGTH).toBe(50);
    const sixty = Array.from({ length: 60 }, (_, i) => entry(`e${i}`));
    const state = applyFeed([], { type: 'snapshot', entries: sixty });
    expect(state).toHaveLength(50);
    expect(ids(state)[0]).toBe('e0');
    expect(ids(state)[49]).toBe('e49');
    const next = applyFeed(state, { type: 'entry', entry: entry('new') });
    expect(next).toHaveLength(50);
    expect(ids(next)[0]).toBe('new');
    expect(ids(next)).not.toContain('e49');
  });

  it('the "Latest" slice is the newest 20 of the state', () => {
    expect(FEED_SHOWN).toBe(20);
    const state = applyFeed([], {
      type: 'snapshot',
      entries: Array.from({ length: 30 }, (_, i) => entry(`e${i}`)),
    });
    expect(ids(state.slice(0, FEED_SHOWN))).toEqual(Array.from({ length: 20 }, (_, i) => `e${i}`));
  });
});
