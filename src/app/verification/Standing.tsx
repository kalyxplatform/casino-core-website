import * as webapi from '@/lib/webapi';
import { ResponderCodes } from '@/lib/webapi';
import { readStanding } from '@/lib/verification-server';
import { noticeHasContent, noticeView } from '@/lib/verification';
import { VerificationNotice } from '@/components/VerificationNotice';
import { VerificationStep } from '@/components/VerificationStep';
import { DeclarationForm } from './DeclarationForm';

/**
 * Where the player stands — shared by `/verification` and (015) `/verification/return`.
 *
 * The standing is read on the server on every render, `no-store`, and never
 * logged. It carries the player's own declared identity and (015) their open
 * session's reference and hand-off address; none of that is rendered or passed to
 * a client component — only `noticeView`'s copy, which drops all three, crosses
 * into the browser (SEC-M10).
 */
export async function Standing({ token, defaultCountryId }: { token: string; defaultCountryId: string }) {
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
        {/* The session step below says what to do, once, when there is one (015). */}
        {view.nextStep && !view.step && (
          <div className="px-4 py-3">
            <dt className="text-sm text-ink-muted">Next step</dt>
            <dd className="mt-1 text-sm">{view.nextStep}</dd>
          </div>
        )}
      </dl>

      {view.step && <VerificationStep step={view.step} />}

      {noticeHasContent(view) ? (
        <VerificationNotice view={view} onVerificationPage />
      ) : (
        !view.step && <NothingRequired />
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
