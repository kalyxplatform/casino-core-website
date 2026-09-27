import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BetFeed } from '@/components/BetFeed';
import type { LiveFeedEntry, LiveHandlers } from '@/lib/useLiveChannel';

// Backend feature 006, US3 (T052 / T053) — the "Winners" tab, and "Latest" = the
// newest 20 of the 50 kept (FR-031, FR-034, SC-002, SR-M3).
//
// The channel is replaced by a capture of the handlers `BetFeed` registers, so the
// test drives exactly the frames the relay would deliver: `feed_snapshot`, `feed`,
// `feed_removed`. The reducer and the tabs underneath are the real ones.

let handlers: LiveHandlers = {};
vi.mock('@/lib/useLiveChannel', () => ({
  useLiveChannel: (h: LiveHandlers) => {
    handlers = h;
  },
}));
// `LiveBalances` (imported for its context) imports a server action; never reached here.
vi.mock('@/actions/realtime', () => ({ refreshBalanceAction: async () => null }));

const T0 = Date.UTC(2026, 8, 27, 12, 0, 0);

function entry(id: string, kind: 'bet' | 'win', at: number, amount = '1'): LiveFeedEntry {
  return {
    entry_id: id,
    kind,
    game_name: 'Book of Tests',
    label: `player-${id}`,
    amount,
    currency_code: 'SC',
    at,
  };
}

/** The labels shown in the named tab's panel, top to bottom. */
function shown(tab: 'Latest' | 'Winners'): string[] {
  fireEvent.click(screen.getByRole('tab', { name: tab }));
  expect(screen.getByRole('tab', { name: tab }).getAttribute('aria-selected')).toBe('true');
  const panel = screen.getByRole('tabpanel');
  return within(panel)
    .queryAllByRole('listitem')
    .map((row) => row.textContent?.match(/player-[\w-]+/)?.[0] ?? '?');
}

const snapshot = (entries: LiveFeedEntry[]) => act(() => handlers.onFeedSnapshot?.(entries));
const live = (e: LiveFeedEntry) => act(() => handlers.onFeed?.(e));
const removed = (ids: string[]) => act(() => handlers.onFeedRemoved?.(ids));

describe('BetFeed — Latest and Winners', () => {
  beforeEach(() => {
    handlers = {};
    vi.useFakeTimers({ now: T0 + 60_000, toFake: ['Date', 'setInterval', 'clearInterval'] });
    render(<BetFeed />);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // Newest first, as the backend sends it: w2, b3, w1, b2, b1.
  const five = [
    entry('w2', 'win', T0 + 5),
    entry('b3', 'bet', T0 + 4),
    entry('w1', 'win', T0 + 3),
    entry('b2', 'bet', T0 + 2),
    entry('b1', 'bet', T0 + 1),
  ];

  it('Winners renders exactly the wins of the snapshot, newest first', () => {
    snapshot(five);
    expect(shown('Winners')).toEqual(['player-w2', 'player-w1']);
    expect(shown('Latest')).toEqual(['player-w2', 'player-b3', 'player-w1', 'player-b2', 'player-b1']);
  });

  it('a live win prepends to both tabs; a live bet to Latest only', () => {
    snapshot(five);
    live(entry('w3', 'win', T0 + 10, '2.5'));
    expect(shown('Latest')[0]).toBe('player-w3');
    expect(shown('Winners')).toEqual(['player-w3', 'player-w2', 'player-w1']);
    const winnersPanel = screen.getByRole('tabpanel');
    expect(within(winnersPanel).getAllByRole('listitem')[0].textContent).toContain('2.5');

    live(entry('b4', 'bet', T0 + 11));
    expect(shown('Latest').slice(0, 2)).toEqual(['player-b4', 'player-w3']);
    expect(shown('Winners')).toEqual(['player-w3', 'player-w2', 'player-w1']);
  });

  it('does not filter on amount — the listener drops a zero amount, not the component', () => {
    // A zero-amount entry never arrives. If one did, it is shown: a second rule here
    // would drift from the listener's (FR-033 lives in one place).
    snapshot([entry('w0', 'win', T0 + 1, '0')]);
    expect(shown('Winners')).toEqual(['player-w0']);
    expect(shown('Latest')).toEqual(['player-w0']);
  });

  it('feed_removed removes from both tabs', () => {
    snapshot(five);
    removed(['w1', 'b2']);
    expect(shown('Latest')).toEqual(['player-w2', 'player-b3', 'player-b1']);
    expect(shown('Winners')).toEqual(['player-w2']);
  });

  it('a duplicate entry_id is ignored', () => {
    snapshot(five);
    live(entry('w2', 'win', T0 + 20, '99'));
    expect(shown('Latest')).toEqual(['player-w2', 'player-b3', 'player-w1', 'player-b2', 'player-b1']);
    expect(shown('Winners')).toEqual(['player-w2', 'player-w1']);
    expect(screen.getByRole('tabpanel').textContent).not.toContain('99');
  });

  it('Latest shows the newest 20 of a 30-entry snapshot; Winners filters all kept, then at most 20', () => {
    // 30 entries newest first: e29 … e0. Every third is a bet, the rest wins.
    const thirty = Array.from({ length: 30 }, (_, i) => {
      const n = 29 - i;
      return entry(`e${n}`, n % 3 === 0 ? 'bet' : 'win', T0 + n);
    });
    snapshot(thirty);
    expect(shown('Latest')).toEqual(thirty.slice(0, 20).map((e) => e.label));

    const wins = thirty.filter((e) => e.kind === 'win');
    expect(wins.length).toBe(20);
    // The wins among ALL 30 kept, not only among the 20 Latest shows.
    expect(shown('Winners')).toEqual(wins.map((e) => e.label));
  });

  it('Winners shows at most 20 even when more than 20 wins are kept', () => {
    const wins = Array.from({ length: 50 }, (_, i) => entry(`x${49 - i}`, 'win', T0 + 49 - i));
    snapshot(wins);
    expect(shown('Winners')).toEqual(wins.slice(0, 20).map((e) => e.label));
  });

  it('an empty Winners tab is a quiet placeholder, never an error', () => {
    snapshot([entry('b1', 'bet', T0 + 1)]);
    expect(shown('Winners')).toEqual([]);
    expect(screen.getByRole('tabpanel').textContent).toMatch(/no wins yet/i);
  });
});
