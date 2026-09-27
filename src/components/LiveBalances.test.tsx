import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveBalancesProvider, useLiveAmounts } from '@/components/LiveBalances';
import type { LiveBalance, LiveHandlers, LiveHello } from '@/lib/useLiveChannel';
import type { AccountBalance } from '@/lib/webapi';

// Backend feature 006, T063 (SR-M2, FR-003 / FR-004, R5) — the provider's merge rules:
// the newest `(committed_at, sequence)` per currency wins; the re-read made on every open
// carries no ordering, so it fills only a currency no event touched while it was in
// flight, and yields to any later event.
//
// The channel is a capture of the handlers the provider registers (as in BetFeed.test);
// the re-read is a server action whose answer the test releases by hand.

let handlers: LiveHandlers = {};
vi.mock('@/lib/useLiveChannel', () => ({
  useLiveChannel: (h: LiveHandlers) => {
    handlers = h;
  },
}));

let releaseReread: (rows: AccountBalance[] | null) => void = () => undefined;
vi.mock('@/actions/realtime', () => ({
  refreshBalanceAction: () =>
    new Promise<AccountBalance[] | null>((resolve) => {
      releaseReread = resolve;
    }),
}));

const SERVER = { available_balance: 'server', locked_balance: 'server-locked' };

function Shown({ code }: { code: string }) {
  const amounts = useLiveAmounts(code, SERVER);
  return (
    <span data-testid={code}>
      {amounts.available_balance}|{amounts.locked_balance}
    </span>
  );
}

const shown = (code: string) => screen.getByTestId(code).textContent;

const event = (code: string, available: string, committedAt: number, sequence = 0): LiveBalance => ({
  currency_code: code,
  available_balance: available,
  locked_balance: '0',
  ordering: { committed_at: committedAt, sequence },
});

const row = (code: string, available: string) =>
  ({
    available_balance: available,
    locked_balance: 'read-locked',
    currency: { code },
  }) as unknown as AccountBalance;

const hello: LiveHello = { channel_id: 'c', kind: 'player', max_life_seconds: 1800, server_time: 1 };
const open = () => act(() => handlers.onOpen?.(hello));
const deliver = (balance: LiveBalance) => act(() => handlers.onBalance?.(balance));
const reread = async (rows: AccountBalance[] | null) => {
  await act(async () => {
    releaseReread(rows);
  });
};

describe('LiveBalancesProvider — the merge', () => {
  beforeEach(() => {
    handlers = {};
    render(
      <LiveBalancesProvider>
        <Shown code="SC." />
        <Shown code="GC." />
      </LiveBalancesProvider>,
    );
  });
  afterEach(() => cleanup());

  it('renders the server amounts until the channel has any', () => {
    expect(shown('SC.')).toBe('server|server-locked');
  });

  it('keeps the newest (committed_at, sequence) per currency and ignores an older event', () => {
    deliver(event('SC.', '5', 1_000, 0));
    expect(shown('SC.')).toBe('5|0');
    deliver(event('SC.', '4', 999, 9));
    expect(shown('SC.')).toBe('5|0');
    deliver(event('SC.', '6', 1_000, 1));
    expect(shown('SC.')).toBe('6|0');
    deliver(event('SC.', '7', 1_000, 0));
    expect(shown('SC.')).toBe('6|0');
    // Another currency is its own ordering.
    deliver(event('GC.', '100', 1, 0));
    expect(shown('GC.')).toBe('100|0');
    expect(shown('SC.')).toBe('6|0');
  });

  it('matches currencies through currencyLabel: an event spelled "SC" moves the "SC." row', () => {
    deliver(event('SC', '5', 1_000));
    expect(shown('SC.')).toBe('5|0');
  });

  it('a re-read never overwrites a currency an event touched while it was in flight', async () => {
    open();
    deliver(event('SC.', 'event-newer', 2_000));
    await reread([row('SC.', 'read-older'), row('GC.', 'read-gc')]);
    expect(shown('SC.')).toBe('event-newer|0');
    // An untouched currency is filled by the read.
    expect(shown('GC.')).toBe('read-gc|read-locked');
  });

  it('a re-read entry (no ordering) yields to ANY later event, however old its timestamp', async () => {
    open();
    await reread([row('SC.', 'read')]);
    expect(shown('SC.')).toBe('read|read-locked');
    deliver(event('SC.', 'any-event', 1, 0));
    expect(shown('SC.')).toBe('any-event|0');
  });

  it('a re-read overwrites an event older than the read began (it is the fresher value)', async () => {
    deliver(event('SC.', 'event-before-open', 1_000));
    open();
    await reread([row('SC.', 'read-after')]);
    expect(shown('SC.')).toBe('read-after|read-locked');
  });

  it('a failed re-read (null) leaves what is shown', async () => {
    deliver(event('SC.', '5', 1_000));
    open();
    await reread(null);
    expect(shown('SC.')).toBe('5|0');
  });
});
