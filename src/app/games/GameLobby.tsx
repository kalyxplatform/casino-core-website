'use client';

import { useActionState, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { launchAction } from '@/actions/games';
import { emptyLaunch } from '@/lib/launch-state';
import type { AccountBalance, GameSummary } from '@/lib/webapi';
import { currencyLabel, formatBalance } from '@/lib/money';
import { Alert } from '@/components/Alert';
import { SubmitButton } from '@/components/SubmitButton';
import { GameFrame } from './GameFrame';

const COARSE_POINTER = '(pointer: coarse)';

const subscribeToPointer = (onChange: () => void) => {
  const query = window.matchMedia(COARSE_POINTER);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const readCoarsePointer = () => window.matchMedia(COARSE_POINTER).matches;

/**
 * The catalogue, the currency it is played in, and the frame a launch opens in.
 *
 * ONE `useActionState` shared by every card with a `<form>` PER card — the same
 * shape `StoreFront` uses, and for the same two reasons: a dispatch is just an
 * action, so several forms can drive one state, and each form keeps its own
 * `useFormStatus` so only the card that was clicked shows as pending.
 *
 * Sharing the state also matches what a launch IS: one player can be playing one
 * game, so a second click replaces the first rather than opening a second frame.
 */
export function GameLobby({
  games,
  failed,
  accounts,
}: {
  games: GameSummary[];
  failed: boolean;
  accounts: AccountBalance[];
}) {
  const router = useRouter();
  const [launch, startLaunch] = useActionState(launchAction, emptyLaunch);

  /**
   * Sweeps coins first when the player holds them: `SC.` is the currency a
   * sweepstake game is meant to be played in, and `GC.` is the play-money one.
   *
   * Compared through `currencyLabel` because the trailing dot is seed data and
   * the backend's own fixtures disagree about it — an environment holding `SC`
   * must still get sweeps coins preselected rather than silently falling back
   * to whichever account happens to come first.
   */
  const preferred =
    accounts.find((account) => currencyLabel(account.currency.code) === 'SC') ?? accounts[0];
  const [currencyCode, setCurrencyCode] = useState(preferred?.currency.code ?? '');

  /**
   * Which build of the game the launcher should hand back.
   *
   * The pointer is a browser fact, so it is SUBSCRIBED to rather than read once:
   * a tablet switching between touch and a trackpad changes the answer, and the
   * server has no pointer at all — hence the `desktop` server snapshot, which is
   * also what the launcher defaults to.
   */
  const touchPointer = useSyncExternalStore(
    subscribeToPointer,
    readCoarsePointer,
    () => false,
  );
  const variant = touchPointer ? 'mobile' : 'desktop';

  /**
   * `useActionState` has no reset, so closing a game is recorded as the address
   * that was dismissed rather than as a boolean. A boolean would have to be
   * cleared when the next launch arrives, and there is no render at which that is
   * safe to do; comparing addresses needs no clearing at all, and a fresh launch
   * of the same game mints a fresh token and so a different address.
   */
  const [dismissed, setDismissed] = useState<string | null>(null);
  const playing = launch.url && launch.url !== dismissed ? launch : null;

  const closeGame = () => {
    setDismissed(launch.url);
    // Every round moved the balance rendered above this component, on the server.
    router.refresh();
  };

  const playingAccount = accounts.find(
    (account) => account.currency.code === playing?.currencyCode,
  );
  const playingGame = games.find((game) => game.code === playing?.gameCode);

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Games</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Rounds are settled against the balance you pick — the same balance the account
        page shows.
      </p>

      <div className="mt-5 space-y-4">
        {launch.error && <Alert tone="error">{launch.error}</Alert>}
        {failed && <Alert tone="error">The games list could not be loaded right now.</Alert>}

        {accounts.length === 0 ? (
          <Alert tone="info">
            You have no playable balance yet. Get coins from the store first.
          </Alert>
        ) : (
          <fieldset className="rounded-xl border border-edge bg-surface p-4">
            <legend className="px-1 text-xs font-medium uppercase tracking-wider text-ink-muted">
              Play with
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {accounts.map((account) => {
                const code = account.currency.code;
                const selected = code === currencyCode;
                return (
                  <label
                    key={account.id}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                      selected
                        ? 'border-accent bg-accent/10 text-ink'
                        : 'border-edge text-ink-muted hover:border-ink-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="currency-choice"
                      value={code}
                      checked={selected}
                      onChange={() => setCurrencyCode(code)}
                      className="sr-only"
                    />
                    <span className="font-medium">{currencyLabel(code)}</span>{' '}
                    <span className="tabular-nums">
                      {formatBalance(account.available_balance, code)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {!failed && games.length === 0 && (
          <p className="rounded-xl border border-edge bg-surface px-4 py-6 text-center text-sm text-ink-muted">
            No games are available at the moment.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {games.map((game) => (
            <form
              key={game.code}
              action={startLaunch}
              className="flex flex-col rounded-xl border border-edge bg-surface p-4"
            >
              <p className="text-sm font-medium">{game.name}</p>
              <p className="mt-1 flex-1 text-xs text-ink-muted">{game.game_provider}</p>

              {/*
                The three properties that are the ENTIRE body of POST /games/launch. The
                player and the brand come from the session and the brand key, and a body
                that named either would be refused as an unknown property. These names are
                the FORM's — `launchAction` maps them to the body's `game_code` and
                `currency_code`.
              */}
              <input type="hidden" name="gameCode" value={game.code} />
              <input type="hidden" name="currencyCode" value={currencyCode} />
              <input type="hidden" name="variant" value={variant} />

              <div className="mt-4">
                <SubmitButton pendingLabel="Opening…" variant="quiet">
                  Play
                </SubmitButton>
              </div>
            </form>
          ))}
        </div>
      </div>

      {playing?.url && (
        <GameFrame
          url={playing.url}
          title={playingGame?.name ?? playing.gameCode ?? 'Game'}
          account={playingAccount}
          onClose={closeGame}
        />
      )}
    </>
  );
}
