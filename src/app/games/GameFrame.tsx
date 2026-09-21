'use client';

import { useEffect } from 'react';
import { currencyLabel, formatBalance } from '@/lib/money';
import type { AccountBalance } from '@/lib/webapi';

/**
 * A launched game, played in place.
 *
 * The address is held in React state and put straight into `src`. It never becomes
 * part of this site's own URL, because it carries a live single-use token for the
 * player's balance and a query string is the one part of a request that reliably
 * survives into proxy logs and `Referer` headers.
 *
 * **Framing is Revolver's decision, not ours.** Its game host may answer with
 * `X-Frame-Options` or a `frame-ancestors` policy that refuses to be embedded, and
 * nothing here can detect that — a blocked frame looks exactly like a blank one to
 * the embedding page. That is why "Open in a new tab" is always offered rather than
 * revealed after a guess: it is the launch path the backend's own contract
 * describes, and it works whatever the game host decides.
 */
export function GameFrame({
  url,
  title,
  account,
  onClose,
}: {
  url: string;
  title: string;
  account: AccountBalance | undefined;
  onClose: () => void;
}) {
  // A game fills the viewport; letting the page behind it scroll under the frame
  // is how you end up scrolling the lobby while dragging a reel on a phone.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <header className="flex flex-wrap items-center gap-3 border-b border-edge bg-surface px-4 py-2.5">
        <p className="text-sm font-semibold tracking-tight">{title}</p>

        {account && (
          <p className="rounded-full bg-surface-raised px-2.5 py-1 text-xs tabular-nums text-ink-muted">
            <span className="font-medium text-ink">
              {formatBalance(account.available_balance, account.currency.code)}
            </span>{' '}
            {currencyLabel(account.currency.code)}
          </p>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/*
            `noreferrer` is not decoration: without it the token in this address
            would be handed to the game host as a `Referer` on every request the
            new tab makes.
          */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink-muted transition hover:border-ink-muted hover:text-ink"
          >
            Open in a new tab
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:brightness-110"
          >
            Close game
          </button>
        </div>
      </header>

      {/*
        No `sandbox`: the game needs scripts, storage and its own origin to run, and
        a sandbox permissive enough to allow all three restricts nothing while
        making it look as though it does. `allow` is the opposite — it grants the
        two things a frame does NOT get by default and that a slot needs.
      */}
      <iframe
        src={url}
        title={title}
        allow="autoplay; fullscreen"
        className="min-h-0 w-full flex-1 border-0 bg-black"
      />

      <p className="border-t border-edge bg-surface px-4 py-2 text-center text-xs text-ink-muted">
        Not loading? Some games refuse to be embedded — open it in a new tab instead.
      </p>
    </div>
  );
}
