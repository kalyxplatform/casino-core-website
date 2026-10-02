import Link from 'next/link';
import type { GatedAction, NoticeRule, NoticeView } from '@/lib/verification';
import { DismissSuggestion } from './DismissSuggestion';

/**
 * Backend feature 007 — where a player stands, on the pages it affects.
 *
 * Two shapes, decided by the standing:
 *
 *  - a BLOCKING panel when a rule requires something, an operator demand stands,
 *    a verification was rejected, or an action this page offers is closed;
 *  - a dismissable BANNER for each suggestion the player has not dismissed.
 *
 * Every backend string here — rule names, `demand_reason`, `rejection_reason` — is
 * OPERATOR-written and is rendered as a React text child, which React escapes.
 * Never as markup, never through `dangerouslySetInnerHTML` (SEC-M10, pinned by
 * `VerificationNotice.test.tsx`).
 *
 * It takes a `NoticeView`, never the standing itself: the standing carries the
 * player's declared identity and this component's props are serialised into the
 * page because `DismissSuggestion` is a client component.
 */

const ACTION_WORDS: Record<GatedAction, string> = {
  game: 'Playing games',
  purchase: 'Buying coins',
  withdrawal: 'Withdrawals',
};

export function VerificationNotice({
  view,
  action,
  onVerificationPage = false,
}: {
  view: NoticeView;
  /** The action this page offers, so its closure is said first. */
  action?: GatedAction;
  /** On `/verification` itself the "go verify" link would point at the page you are on. */
  onVerificationPage?: boolean;
}) {
  const closedActions = (Object.keys(view.closed) as GatedAction[]).filter(
    (key) => view.closed[key],
  );
  const blocking =
    view.required.length > 0 ||
    view.demandReason !== null ||
    view.rejectionReason !== null ||
    (action !== undefined && view.closed[action]);

  return (
    <div className="space-y-3">
      {blocking && (
        <section
          aria-labelledby="verification-required-heading"
          className="rounded-xl border border-danger/40 bg-danger/10 p-4"
        >
          <h2 id="verification-required-heading" className="text-sm font-semibold text-danger">
            {action && view.closed[action]
              ? `${ACTION_WORDS[action]} is paused until your identity is verified`
              : 'Identity verification required'}
          </h2>

          {view.demandReason !== null && (
            <p className="mt-2 text-sm text-ink">{view.demandReason}</p>
          )}
          {view.rejectionReason !== null && (
            <p className="mt-2 text-sm text-ink">
              <span className="font-medium">Your verification was rejected: </span>
              {view.rejectionReason}
            </p>
          )}

          {view.required.length > 0 && <RuleList rules={view.required} />}

          {closedActions.length > 0 && (
            <p className="mt-2 text-sm text-ink-muted">
              Closed for now: {closedActions.map((key) => ACTION_WORDS[key]).join(', ')}.
            </p>
          )}

          <NextStep view={view} onVerificationPage={onVerificationPage} />
        </section>
      )}

      {view.suggested.map((rule) => (
        <section
          key={rule.rule}
          aria-label="Verification suggested"
          className="flex items-start justify-between gap-4 rounded-xl border border-accent/40 bg-accent/10 p-4"
        >
          <div>
            <p className="text-sm font-medium text-ink">Verify your identity</p>
            <p className="mt-1 text-sm text-ink-muted">
              {rule.moment} — {rule.level.toLowerCase()} is suggested.
            </p>
            {!onVerificationPage && view.canDeclare && (
              <Link
                href="/verification"
                className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
              >
                Verify now
              </Link>
            )}
          </div>
          <DismissSuggestion rule={rule.rule} />
        </section>
      ))}
    </div>
  );
}

function RuleList({ rules }: { rules: NoticeRule[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {rules.map((rule) => (
        <li key={rule.rule} className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{rule.level}</span> — {rule.moment.toLowerCase()}
          {rule.requiredFrom && <> (from {rule.requiredFrom})</>}
          <span className="sr-only"> (rule {rule.rule})</span>
        </li>
      ))}
    </ul>
  );
}

function NextStep({ view, onVerificationPage }: { view: NoticeView; onVerificationPage: boolean }) {
  return (
    <>
      {/* On `/verification` the page states the next step itself, once. */}
      {view.nextStep && !onVerificationPage && (
        <p className="mt-3 text-sm text-ink">{view.nextStep}</p>
      )}
      {!onVerificationPage && (
        <Link
          href="/verification"
          className="mt-3 inline-flex items-center rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink transition hover:brightness-110"
        >
          {view.canDeclare ? 'Verify your identity' : 'See your verification'}
        </Link>
      )}
    </>
  );
}
