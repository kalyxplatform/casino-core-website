import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  QUICK_REOPEN_MS,
  REOPEN_BACKOFF,
  REOPEN_JITTER_MS,
  reopenDelayMs,
  useLiveChannel,
  type LiveBalance,
  type LiveHandlers,
} from '@/lib/useLiveChannel';

// Backend feature 006, T063 (FR-003 – FR-005, PERF-M11, design M7) and T059a / SR-M1 —
// the page's one channel: the reopen timing and the stale-balance drop.
//
// `EventSource` is replaced by a fake that records every instance, so the test sees each
// (re)open and dispatches exactly the frames the relay would.

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  closed = false;
  private listeners = new Map<string, ((event: MessageEvent | Event) => void)[]>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, listener: (event: MessageEvent | Event) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  close() {
    this.closed = true;
  }
  emit(type: string, data?: unknown) {
    if (this.closed) return;
    const event =
      data === undefined ? new Event(type) : new MessageEvent(type, { data: JSON.stringify(data) });
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

const opens = () => FakeEventSource.instances.length;
const current = () => FakeEventSource.instances[FakeEventSource.instances.length - 1];

const T = 1_790_000_000_000;
const hello = (serverTime = T) => ({
  channel_id: 'c',
  kind: 'player',
  max_life_seconds: 1800,
  server_time: serverTime,
});
const balance = (committedAt: number, sequence = 0): LiveBalance => ({
  currency_code: 'SC.',
  available_balance: '9.000000000000000000000000000000',
  locked_balance: '0.000000000000000000000000000000',
  ordering: { committed_at: committedAt, sequence },
});

function mount(handlers: LiveHandlers = {}) {
  return renderHook(() => useLiveChannel(handlers));
}

/** Milliseconds until the next open appears, measured with fake timers (1 ms resolution). */
function delayUntilNextOpen(limitMs = 70_000): number {
  const before = opens();
  for (let t = 1; t <= limitMs; t++) {
    vi.advanceTimersByTime(1);
    if (opens() > before) return t;
  }
  throw new Error('no reopen within the limit');
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('reopenDelayMs — the pure rule', () => {
  it('a healthy bye draws uniformly from [0, 20 000)', () => {
    expect(reopenDelayMs(0, () => 0)).toBe(0);
    expect(reopenDelayMs(0, () => 0.5)).toBe(10_000);
    expect(reopenDelayMs(0, () => 0.999999)).toBeLessThan(REOPEN_JITTER_MS);
    const samples = Array.from({ length: 2_000 }, () => reopenDelayMs(0));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...samples)).toBeLessThan(20_000);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(mean).toBeGreaterThan(9_000);
    expect(mean).toBeLessThan(11_000);
  });

  it('two waves of 500 channels draw uncorrelated delays (PERF-M11)', () => {
    const n = 500;
    const a = Array.from({ length: n }, () => reopenDelayMs(0));
    const b = Array.from({ length: n }, () => reopenDelayMs(0));
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const [ma, mb] = [mean(a), mean(b)];
    let cov = 0;
    let va = 0;
    let vb = 0;
    for (let i = 0; i < n; i++) {
      cov += (a[i] - ma) * (b[i] - mb);
      va += (a[i] - ma) ** 2;
      vb += (b[i] - mb) ** 2;
    }
    expect(Math.abs(cov / Math.sqrt(va * vb))).toBeLessThan(0.2);
  });

  it('consecutive failures grow the delay to the 60 s cap, never below the 3 s floor', () => {
    const { floorMs, capMs } = REOPEN_BACKOFF;
    const high = [1, 2, 3, 4, 5, 6, 10, 50].map((f) => reopenDelayMs(f, () => 0.999999));
    for (let i = 1; i < high.length; i++) expect(high[i]).toBeGreaterThanOrEqual(high[i - 1]);
    expect(Math.round(high[0])).toBe(4_000);
    expect(Math.round(high[1])).toBe(8_000);
    expect(Math.round(high[4])).toBe(capMs);
    expect(high[7]).toBeLessThanOrEqual(capMs);
    for (let f = 1; f <= 40; f++) {
      for (const r of [0, 0.25, 0.5, 0.999999]) {
        const d = reopenDelayMs(f, () => r);
        expect(d).toBeGreaterThanOrEqual(floorMs);
        expect(d).toBeLessThanOrEqual(capMs);
      }
    }
    // The lower half of the draw is the floor at first, half the cap at worst.
    expect(reopenDelayMs(1, () => 0)).toBe(floorMs);
    expect(reopenDelayMs(10, () => 0)).toBe(capMs / 2);
  });
});

describe('useLiveChannel — reopen timing through the hook', () => {
  beforeEach(() => vi.useFakeTimers());

  it('opens ONE same-origin channel on mount', () => {
    mount();
    expect(opens()).toBe(1);
    expect(current().url).toBe('/api/live');
  });

  it('repeated failures back off: each wait at least as long as the last, capped at 60 s, never under 3 s', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    mount();
    const waits: number[] = [];
    for (let i = 0; i < 7; i++) {
      current().emit('error');
      waits.push(delayUntilNextOpen());
    }
    expect(waits.slice(0, 5)).toEqual([4_000, 8_000, 16_000, 32_000, 60_000]);
    expect(waits[6]).toBe(60_000);
    for (const w of waits) expect(w).toBeGreaterThanOrEqual(REOPEN_BACKOFF.floorMs);
  });

  it('a bye BEFORE any hello is a failure too (a refusal that closes at once)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    mount();
    current().emit('bye', { reason: 'restarting' });
    expect(delayUntilNextOpen()).toBe(4_000);
    current().emit('bye', { reason: 'restarting' });
    expect(delayUntilNextOpen()).toBe(8_000);
  });

  it('a hello resets the count: the next failure starts from the floor again', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    mount();
    current().emit('error');
    delayUntilNextOpen();
    current().emit('error');
    delayUntilNextOpen();
    current().emit('hello', hello());
    current().emit('error');
    expect(delayUntilNextOpen()).toBe(4_000);
  });

  it('a restarting or replaced bye after a healthy hello draws from [0, 20 000] — not the back-off', () => {
    const random = vi.spyOn(Math, 'random');
    mount();
    current().emit('error');
    random.mockReturnValue(1);
    delayUntilNextOpen();
    current().emit('hello', hello());
    random.mockReturnValue(0.05);
    current().emit('bye', { reason: 'restarting' });
    expect(delayUntilNextOpen()).toBe(1_000);
    current().emit('hello', hello());
    random.mockReturnValue(0.9);
    current().emit('bye', { reason: 'replaced' });
    expect(delayUntilNextOpen()).toBe(18_000);
  });

  it('a max-life bye after a healthy hello reopens within 1 s — its end is already spread, and a round settled in the gap waits for it (SC-001)', () => {
    const random = vi.spyOn(Math, 'random');
    mount();
    current().emit('hello', hello());
    random.mockReturnValue(0.9);
    current().emit('bye', { reason: 'max-life' });
    expect(delayUntilNextOpen()).toBe(900);
    current().emit('hello', hello());
    random.mockReturnValue(0.999999);
    current().emit('bye', { reason: 'max-life' });
    expect(delayUntilNextOpen()).toBeLessThanOrEqual(QUICK_REOPEN_MS);
  });

  it('a max-life bye BEFORE any hello is still a failure (back-off, not the quick reopen)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    mount();
    current().emit('bye', { reason: 'max-life' });
    expect(delayUntilNextOpen()).toBe(4_000);
  });

  it('closes the channel and schedules nothing after unmount', () => {
    const { unmount } = mount();
    const channel = current();
    current().emit('error');
    unmount();
    expect(channel.closed).toBe(true);
    vi.advanceTimersByTime(120_000);
    expect(opens()).toBe(1);
  });
});

describe('useLiveChannel — the M7 stale drop, against hello.server_time', () => {
  it('a balance committed more than 2 s before hello.server_time is dropped; one inside the window is delivered', () => {
    const onBalance = vi.fn();
    const onOpen = vi.fn();
    mount({ onBalance, onOpen });
    current().emit('hello', hello(T));
    expect(onOpen).toHaveBeenCalledTimes(1);

    current().emit('balance', balance(T - 2_001));
    expect(onBalance).not.toHaveBeenCalled();

    current().emit('balance', balance(T - 2_000, 1));
    current().emit('balance', balance(T + 5));
    expect(onBalance.mock.calls.map(([b]) => b.ordering.committed_at)).toEqual([T - 2_000, T + 5]);
  });

  it('the window moves with every hello: a reopen with a later server_time drops what the first allowed', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const onBalance = vi.fn();
    mount({ onBalance });
    current().emit('hello', hello(T));
    current().emit('balance', balance(T - 1_000));
    expect(onBalance).toHaveBeenCalledTimes(1);
    current().emit('bye', { reason: 'max-life' });
    vi.advanceTimersByTime(1);
    current().emit('hello', hello(T + 10_000));
    current().emit('balance', balance(T - 1_000));
    expect(onBalance).toHaveBeenCalledTimes(1);
  });
});
