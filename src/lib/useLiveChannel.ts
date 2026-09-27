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

/** A reopen waits 0–20 s, so a cohort closed together does not return together (PERF-M3/M11). */
const REOPEN_JITTER_MS = 20_000;
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

    const scheduleReopen = () => {
      source?.close();
      source = null;
      if (disposed || reopen !== undefined) return;
      reopen = setTimeout(() => {
        reopen = undefined;
        open();
      }, Math.random() * REOPEN_JITTER_MS);
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
      // `bye` (max-life, session-ended, restarting) and any error — including the
      // relay's 204 "no channel" — close and come back after the jitter. The
      // browser's own reconnect is not relied on: it would not jitter.
      channel.addEventListener('bye', scheduleReopen);
      channel.addEventListener('error', scheduleReopen);
    };

    open();
    return () => {
      disposed = true;
      if (reopen !== undefined) clearTimeout(reopen);
      source?.close();
    };
  }, []);
}
