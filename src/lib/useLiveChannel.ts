'use client';

import { useEffect, useRef } from 'react';

/**
 * The page's one live channel: `new EventSource('/api/live')` (backend feature
 * 006, R4 / R5 / R13). Shapes are `specs/006-realtime-balance-feed/contracts/
 * event-*.json` key for key; amounts stay STRINGS.
 */
export interface LiveHello {
  channel_id: string;
  kind: 'player' | 'brand';
  max_life_seconds: number;
  server_time: number;
}

export interface LiveBalance {
  currency_code: string;
  available_balance: string;
  locked_balance: string;
  ordering: { committed_at: number; sequence: number };
}

export interface LiveFeedEntry {
  entry_id: string;
  kind: 'bet' | 'win';
  game_name: string;
  label: string;
  amount: string;
  currency_code: string;
  at: number;
}

export interface LiveHandlers {
  /** Every (re)open — the page re-reads the balance here (FR-004). */
  onOpen?: (hello: LiveHello) => void;
  onBalance?: (balance: LiveBalance) => void;
  onFeedSnapshot?: (entries: LiveFeedEntry[]) => void;
  onFeed?: (entry: LiveFeedEntry) => void;
  onFeedRemoved?: (entryIds: string[]) => void;
}

/** A healthy reopen waits 0–20 s, so a cohort closed together does not return together (PERF-M3/M11). */
export const REOPEN_JITTER_MS = 20_000;
/**
 * A `bye: max-life` after a `hello` reopens within 1 s instead. That end is already
 * spread — `webapi` jitters a channel's life over 240–300 s and the relay ends its own at
 * 60–95 % of `maxDuration` — so it is never a cohort, and every second of gap is a second
 * in which a settled round waits for the reopen's balance re-read (SC-001). `restarting`
 * (a whole revision at once), `replaced` and `session-ended` keep the cohort jitter.
 */
export const QUICK_REOPEN_MS = 1_000;
/**
 * Back-off after a FAILED open (FR-005, plan M11, SR-M1): `base × 2^failures`, capped,
 * drawn from its upper half, never below the floor. A persistent refusal — the relay's
 * 204 "no channel" for an ended session, `realtime-capacity`, a subscriber-loss close —
 * then retries every few seconds at first and once a minute at worst, never at ~10 s for
 * ever.
 */
export const REOPEN_BACKOFF = { baseMs: 2_000, floorMs: 3_000, capMs: 60_000 } as const;

/**
 * Milliseconds before the next open. `failures` counts CONSECUTIVE failed opens (an
 * `error`, or a `bye` before any `hello`); `0` means the last channel was healthy and
 * ended by `bye` — the plain cohort jitter, uniform in [0, 20 000).
 */
export function reopenDelayMs(failures: number, random: () => number = Math.random): number {
  if (failures <= 0) return random() * REOPEN_JITTER_MS;
  const { baseMs, floorMs, capMs } = REOPEN_BACKOFF;
  const ceiling = Math.min(baseMs * 2 ** failures, capMs);
  return Math.max(floorMs, ceiling * (0.5 + 0.5 * random()));
}
/** Design M7 — a balance older than this before `hello` predates the re-read. */
const STALE_BEFORE_HELLO_MS = 2_000;

const parse = <T,>(event: MessageEvent): T | null => {
  try {
    return JSON.parse(String(event.data)) as T;
  } catch {
    return null;
  }
};

export function useLiveChannel(handlers: LiveHandlers): void {
  // The latest handlers, without reopening the channel every render.
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    let source: EventSource | null = null;
    let reopen: ReturnType<typeof setTimeout> | undefined;
    let serverTime: number | null = null;
    let disposed = false;
    /** Consecutive failed opens; reset by `hello`. */
    let failures = 0;

    const scheduleReopen = (failed: boolean, quick = false) => {
      source?.close();
      source = null;
      if (disposed || reopen !== undefined) return;
      failures = failed ? failures + 1 : 0;
      reopen = setTimeout(
        () => {
          reopen = undefined;
          open();
        },
        quick ? Math.random() * QUICK_REOPEN_MS : reopenDelayMs(failures),
      );
    };

    const open = () => {
      if (disposed) return;
      serverTime = null;
      const channel = new EventSource('/api/live');
      source = channel;

      channel.addEventListener('hello', (event) => {
        const hello = parse<LiveHello>(event as MessageEvent);
        if (!hello) return;
        serverTime = hello.server_time;
        failures = 0;
        latest.current.onOpen?.(hello);
      });
      channel.addEventListener('balance', (event) => {
        const balance = parse<LiveBalance>(event as MessageEvent);
        if (!balance) return;
        if (serverTime !== null && balance.ordering.committed_at < serverTime - STALE_BEFORE_HELLO_MS) {
          return;
        }
        latest.current.onBalance?.(balance);
      });
      channel.addEventListener('feed_snapshot', (event) => {
        const snapshot = parse<{ entries: LiveFeedEntry[] }>(event as MessageEvent);
        if (snapshot) latest.current.onFeedSnapshot?.(snapshot.entries);
      });
      channel.addEventListener('feed', (event) => {
        const entry = parse<LiveFeedEntry>(event as MessageEvent);
        if (entry) latest.current.onFeed?.(entry);
      });
      channel.addEventListener('feed_removed', (event) => {
        const removed = parse<{ entry_ids: string[] }>(event as MessageEvent);
        if (removed) latest.current.onFeedRemoved?.(removed.entry_ids);
      });
      // `bye` after a `hello` is a healthy end: `max-life` (from `webapi`, or from the
      // relay at its own lifetime) back within 1 s, the others after the cohort jitter.
      // Any error — including the relay's 204 "no channel" — and a `bye` before any
      // `hello` are failures: back after the growing back-off. The browser's own
      // reconnect is not relied on: it would neither jitter nor back off.
      channel.addEventListener('bye', (event) => {
        const bye = parse<{ reason?: string }>(event as MessageEvent);
        const healthy = serverTime !== null;
        scheduleReopen(!healthy, healthy && bye?.reason === 'max-life');
      });
      channel.addEventListener('error', () => scheduleReopen(true));
    };

    open();
    return () => {
      disposed = true;
      if (reopen !== undefined) clearTimeout(reopen);
      source?.close();
    };
  }, []);
}
