import { Suspense } from 'react';
import { redirectToExpiredSession, requireSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { currencyLabel } from '@/lib/money';
import { AppShell } from '@/components/AppShell';
import { SkeletonBar, SkeletonCard, SkeletonRegion } from '@/components/Skeleton';
import { LiveBalancesProvider } from '@/components/LiveBalances';
import { BetFeed } from '@/components/BetFeed';
import { GameLobby } from './GameLobby';
import { readStanding } from '@/lib/verification-server';
import { noticeView } from '@/lib/verification';
import { VerificationNotice } from '@/components/VerificationNotice';

/**
 * The lobby: the games a signed-in player may open, and the balances they play with.
 *
 * `GET /games` is NOT public — it is behind the same JWT-plus-live-`web_session`
 * guard every other player route is, and the catalogue it answers is platform-wide
 * in this feature rather than per brand. An empty list is a legitimate success.
 *
 * Nothing is launched here. This page only renders the choice; the address that
 * opens a game is minted one click at a time by `launchAction`, because it carries
 * a single-use token and a page that minted one per render would burn a token for
 * every prefetch and every refresh.
 *
 * `GameLobby` owns the heading and the currency picker as well as the grid, so the
 * whole lobby is inside one boundary rather than split across several. It is also
 * one boundary because the three calls behind it are one `Promise.all` — and on
 * this page that matters more than elsewhere: `GET /games` is still a hard 404 on
 * the development API, so the skeleton is what a player sees while the lobby waits
 * to find that out.
 */
export default async function GamesPage() {
  const session = await requireSession();

  return (
    <AppShell player={session.player} current="games">
      {/* Backend feature 006: the header above a game and the picker move as rounds settle. */}
      <LiveBalancesProvider>
        <Suspense fallback={<LobbyFallback />}>
          <Lobby token={session.token} />
        </Suspense>
        {/* US2: the brand's latest bets and wins, on the provider's one channel. */}
        <div className="mt-8">
          <BetFeed />
        </div>
      </LiveBalancesProvider>
    </AppShell>
  );
}

async function Lobby({ token }: { token: string }) {
  // Backend feature 007: the standing rides in the same `Promise.all`, so it costs
  // no round trip. A 404/403 on it (a backend without the route) is "nothing required".
  const [games, balance, currencies, standing] = await Promise.all([
    webapi.listGames(token),
    webapi.getBalance(token),
    webapi.listCurrencies(),
    readStanding(token),
  ]);
  const verification = standing.status === 'standing' ? noticeView(standing.standing) : null;

  if (games.code === ResponderCodes.FORBIDDEN || balance.code === ResponderCodes.FORBIDDEN) {
    redirectToExpiredSession();
  }

  const accounts = balance.code === ResponderCodes.SUCCESS && balance.data ? balance.data : [];

  /**
   * Only a SOCIAL currency can be played in, and the balance response says which
   * currencies a player holds without saying what kind they are — so the kind comes
   * from `GET /currency`.
   *
   * This filter FAILS OPEN, and on more than a failed request. A `200` carrying a
   * body this app cannot read is the same outage as a `500` — it happened: a stale
   * `webapi` cache kept answering the pre-`snake_case` spelling (`Type`, `Code`)
   * long after the rename deployed, every `currency.type` read `undefined`, and a
   * lobby with real balances behind it told the player they had none. So a set that
   * recognises NOTHING is treated as no answer rather than as "nothing is playable";
   * the launch route decides this question anyway and refuses what it must.
   *
   * `listCurrencies` is cached now, which does not change this logic but does change
   * how long that failure would last — see `REFERENCE_DATA_TTL_SECONDS`.
   *
   * Codes are compared through `currencyLabel` — the trailing dot in `GC.` is seed
   * data, the backend's own fixtures disagree about it, and this was the one
   * comparison in the app still reading it raw.
   */
  const social =
    currencies.code === ResponderCodes.SUCCESS && currencies.data
      ? new Set(
          currencies.data
            .filter((currency) => currency.type === 'social' && currency.status === 'active')
            .map((currency) => currencyLabel(currency.code)),
        )
      : null;

  const playable =
    social && social.size > 0
      ? accounts.filter((account) => social.has(currencyLabel(account.currency.code)))
      : accounts;

  return (
    <>
      {verification && (
        <div className="mb-5">
          <VerificationNotice view={verification} action="game" />
        </div>
      )}
      <GameLobby
        games={games.code === ResponderCodes.SUCCESS && games.data ? games.data.games : []}
        failed={games.code !== ResponderCodes.SUCCESS}
        accounts={playable}
        locked={verification?.closed.game ?? false}
      />
    </>
  );
}

function LobbyFallback() {
  return (
    <SkeletonRegion label="Loading the games lobby">
      <h1 className="text-xl font-semibold tracking-tight">Games</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Rounds are settled against the balance you pick — the same balance the account
        page shows.
      </p>

      <div className="mt-5 rounded-xl border border-edge bg-surface p-4">
        <SkeletonBar className="h-3 w-16" />
        <div className="mt-3 flex gap-2">
          <SkeletonBar className="h-9 w-28 rounded-lg" />
          <SkeletonBar className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    </SkeletonRegion>
  );
}
