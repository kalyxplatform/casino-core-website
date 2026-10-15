import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { AppShell } from '@/components/AppShell';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';
import { Standing } from './Standing';

/**
 * Backend feature 007 — where the player stands, and the declaration form.
 *
 * The standing is read on the server on every render, `no-store`, and never
 * logged. It carries the player's own declared identity; this page does not
 * render it back and does not pass it to a client component — only `noticeView`'s
 * copy, which drops it, crosses into the browser (SEC-M10).
 */
export default async function VerificationPage() {
  const session = await requireSession();

  return (
    <AppShell player={session.player} current="verification">
      <h1 className="text-xl font-semibold tracking-tight">Verification</h1>
      <p className="mt-1 text-sm text-ink-muted">
        What this casino asks you to verify, and what you can do about it.
      </p>

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
