import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { readStanding } from '@/lib/verification-server';
import { noticeHasContent, noticeView } from '@/lib/verification';
import { AppShell } from '@/components/AppShell';
import { VerificationNotice } from '@/components/VerificationNotice';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';
import { DeclarationForm } from './DeclarationForm';

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

async function Standing({ token, defaultCountryId }: { token: string; defaultCountryId: string }) {
  const [result, countries] = await Promise.all([readStanding(token), webapi.listCountries()]);

  if (result.status === 'unavailable') {
    return (
      <p className="mt-5 text-sm text-danger">
        Your verification could not be loaded right now. Try again shortly.
      </p>
    );
  }

  // `clear` is also what a backend without the route answers (404/403): nothing asked.
  if (result.status === 'clear') return <NothingRequired />;

  const view = noticeView(result.standing);

  return (
    <div className="mt-5 space-y-5">
      <dl className="divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-surface">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-ink-muted">Level</dt>
          <dd className="text-sm font-medium">{view.level}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-ink-muted">Status</dt>
          <dd className="text-sm font-medium">{view.state}</dd>
        </div>
        {view.nextStep && (
          <div className="px-4 py-3">
            <dt className="text-sm text-ink-muted">Next step</dt>
            <dd className="mt-1 text-sm">{view.nextStep}</dd>
          </div>
        )}
      </dl>

      {noticeHasContent(view) ? (
        <VerificationNotice view={view} onVerificationPage />
      ) : (
        <NothingRequired />
      )}

      {view.canDeclare && (
        <section className="rounded-xl border border-edge bg-surface p-5">
          <h2 className="text-base font-semibold tracking-tight">Declare your identity</h2>
          <p className="mt-1 text-sm text-ink-muted">
            As shown on your identity document. You can declare once; a correction goes through
            support.
          </p>
          <DeclarationForm
            countries={
              countries.code === ResponderCodes.SUCCESS && countries.data ? countries.data : []
            }
            defaultCountryId={defaultCountryId}
          />
        </section>
      )}
    </div>
  );
}

function NothingRequired() {
  return (
    <p className="mt-5 rounded-xl border border-edge bg-surface px-4 py-6 text-center text-sm text-ink-muted">
      Nothing is required of you right now.
    </p>
  );
}
