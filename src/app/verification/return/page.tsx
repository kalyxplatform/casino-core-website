import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { returnParams } from '@/lib/verification';
import { AppShell } from '@/components/AppShell';
import { Alert } from '@/components/Alert';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';
import { Standing } from '../Standing';

/**
 * Backend feature 015 — where the verification provider (through the platform's
 * hand-off) sends the player back: `<website_url>/verification/return`, and
 * `?closed=1` when the hand-off was asked for a session that has ended.
 *
 * Landing here proves NOTHING about the verification: the provider's signed
 * decision reaches the platform server to server and may arrive before or after
 * the player. So this page ONLY re-reads the standing and shows where the player
 * stands. It carries no reference and reads nothing from its address but
 * `closed` (`returnParams` drops the rest unread — contracts §3, SEC-M6).
 */
export default async function VerificationReturnPage(props: PageProps<'/verification/return'>) {
  const session = await requireSession();
  const { closed } = returnParams(await props.searchParams);

  return (
    <AppShell player={session.player} current="verification">
      <h1 className="text-xl font-semibold tracking-tight">Verification</h1>
      <div className="mt-3">
        {closed ? (
          <Alert tone="info">That verification session has ended.</Alert>
        ) : (
          <p className="text-sm text-ink-muted">
            Welcome back. Here is where your verification stands.
          </p>
        )}
      </div>

      <Suspense
        fallback={
          <SkeletonRegion label="Loading your verification">
            <div className="mt-5">
              <SkeletonCard lines={2} />
            </div>
          </SkeletonRegion>
        }
      >
        <Standing token={session.token} defaultCountryId={String(session.player.country_id)} />
      </Suspense>
    </AppShell>
  );
}
