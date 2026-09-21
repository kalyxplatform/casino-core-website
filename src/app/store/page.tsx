import { Suspense } from 'react';
import { redirectToExpiredSession, requireSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { AppShell } from '@/components/AppShell';
import { BalancePanel } from '@/components/BalancePanel';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';
import { StoreFront } from './StoreFront';

/**
 * The package catalogue.
 *
 * `GET /store/packages` is NOT public — it answers for a signed-in player of the
 * resolved brand and nobody else — and it is never cached on either side: a
 * disabled or re-priced package takes effect on the next request.
 *
 * An empty list is a legitimate answer, not an error. A package disappears from it
 * for any of several reasons (disabled, price currency disabled, a malformed line),
 * and the API deliberately does not say which.
 *
 * ## Why the headings are out here and the data is not
 *
 * Every word on this page that does not come from the API renders before the first
 * network call finishes. The two `<Suspense>` boundaries hold only the parts that
 * are actually waiting, so nothing that is already known moves or reflows when the
 * answers land.
 *
 * The two boundaries do NOT serialise the two calls. React starts both async
 * children in the same render pass, so both requests are in flight together — the
 * page waits as long as the slower one, exactly as the old single `Promise.all`
 * did, and shows the faster one as soon as it arrives instead of holding it back.
 */
export default async function StorePage() {
  const session = await requireSession();

  return (
    <AppShell player={session.player} current="store">
      <h1 className="text-xl font-semibold tracking-tight">Balance</h1>
      <div className="mt-4">
        <Suspense fallback={<CardsFallback label="Loading your balance" cards={2} lines={1} />}>
          <Balance token={session.token} />
        </Suspense>
      </div>

      <h2 className="mt-8 text-xl font-semibold tracking-tight">Get coins</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Payment runs against the sandbox provider. No real money is taken.
      </p>

      <Suspense
        fallback={
          <div className="mt-5">
            <CardsFallback label="Loading the packages" cards={3} lines={2} />
          </div>
        }
      >
        <Packages token={session.token} />
      </Suspense>
    </AppShell>
  );
}

async function Balance({ token }: { token: string }) {
  const balance = await webapi.getBalance(token);

  if (balance.code === ResponderCodes.FORBIDDEN) redirectToExpiredSession();

  if (balance.code !== ResponderCodes.SUCCESS || !balance.data) {
    return <p className="text-sm text-danger">Your balance could not be loaded right now.</p>;
  }

  return <BalancePanel balances={balance.data} />;
}

async function Packages({ token }: { token: string }) {
  const packages = await webapi.listPackages(token);

  if (packages.code === ResponderCodes.FORBIDDEN) redirectToExpiredSession();

  return (
    <StoreFront
      packages={packages.code === ResponderCodes.SUCCESS && packages.data ? packages.data : []}
      failed={packages.code !== ResponderCodes.SUCCESS}
    />
  );
}

function CardsFallback({
  label,
  cards,
  lines,
}: {
  label: string;
  cards: number;
  lines: number;
}) {
  return (
    <SkeletonRegion label={label}>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: cards }, (_, card) => (
          <SkeletonCard key={card} lines={lines} />
        ))}
      </div>
    </SkeletonRegion>
  );
}
