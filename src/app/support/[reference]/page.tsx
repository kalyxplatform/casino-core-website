import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { redirectToExpiredSession, requireSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import {
  ASSISTANT_DISCLAIMER,
  ASSISTANT_LABEL,
  SUPPORT_ERRORS,
  SUPPORT_UNAVAILABLE,
  categoryLabel,
  formatInstant,
  isReference,
  statusLabel,
  supportAvailability,
  timelineRows,
} from '@/lib/support';
import { AppShell } from '@/components/AppShell';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';
import { CloseTicket } from './CloseTicket';
import { ReplyForm } from './ReplyForm';

/**
 * Backend feature 008 — one ticket's thread, the reply box and Close.
 *
 * The reference comes from the URL, so it is checked against `isReference` before
 * it goes anywhere near a `webapi` path (SEC-M12); anything else is the site's
 * not-found page, as is HTTP 200 `404 ticket-not-found` (another player's, another
 * brand's or no such ticket — one answer for all).
 *
 * An `assistant`-authored entry (backend 009) is labelled as automated and not a
 * commitment (SEC-M7).
 *
 * Every message is player-, staff- or assistant-written text: a React text child with
 * `whitespace-pre-wrap`, never markup, never auto-linked.
 */
export default async function TicketPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!isReference(reference)) notFound();

  const session = await requireSession();

  return (
    <AppShell player={session.player} current="support">
      <Link href="/support" className="text-sm text-ink-muted hover:text-ink">
        ← All tickets
      </Link>
      <Suspense
        fallback={
          <SkeletonRegion label="Loading the ticket">
            <div className="mt-4 space-y-3">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={3} />
            </div>
          </SkeletonRegion>
        }
      >
        <Thread token={session.token} reference={reference} />
      </Suspense>
    </AppShell>
  );
}

async function Thread({ token, reference }: { token: string; reference: string }) {
  const answer = await webapi.readSupportTicket(token, reference);
  const availability = supportAvailability(answer);

  if (availability === 'signed-out') redirectToExpiredSession();
  if (availability === 'not-found') notFound();

  if (availability === 'unavailable') {
    return (
      <p className="mt-4 rounded-xl border border-edge bg-surface px-4 py-6 text-center text-sm text-ink-muted">
        {SUPPORT_UNAVAILABLE}
      </p>
    );
  }

  if (availability !== 'ok' || !answer.data) {
    return (
      <p className="mt-4 text-sm text-danger">
        This ticket could not be loaded right now. Try again shortly.
      </p>
    );
  }

  const ticket = answer.data;
  const rows = timelineRows(ticket.timeline);

  return (
    <div className="mt-4 space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight break-words">{ticket.subject}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {reference} · {categoryLabel(ticket.category)} · {statusLabel(ticket.status)} · opened{' '}
          {formatInstant(ticket.created_at)}
        </p>
      </header>

      {ticket.timeline_truncated && (
        <p className="text-xs text-ink-muted">Older messages on this ticket are not shown.</p>
      )}

      {/* Oldest first, as the backend sends it. */}
      <ol className="space-y-3">
        {rows.map((row, index) =>
          row.kind === 'comment' ? (
            <li
              key={index}
              className={`rounded-xl border border-edge p-4 ${
                row.who === 'You' ? 'bg-surface' : 'bg-surface-raised'
              }`}
            >
              <div className="flex items-baseline justify-between gap-4 text-xs text-ink-muted">
                <span className="font-medium text-ink">
                  {row.who === 'Assistant' ? ASSISTANT_LABEL : row.who}
                </span>
                <span>{formatInstant(row.at)}</span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap break-words">{row.text}</p>
              {/* SEC-M7: the assistant's words must never read as the brand's promise. */}
              {row.who === 'Assistant' && (
                <p className="mt-2 text-xs text-ink-muted">{ASSISTANT_DISCLAIMER}</p>
              )}
            </li>
          ) : (
            <li key={index} className="px-1 text-xs text-ink-muted">
              {row.note} <span className="opacity-70">{formatInstant(row.at)}</span>
            </li>
          ),
        )}
      </ol>

      {ticket.can_reply ? (
        <section className="rounded-xl border border-edge bg-surface p-5">
          <h2 className="text-base font-semibold tracking-tight">Reply</h2>
          <ReplyForm reference={reference} />
        </section>
      ) : (
        <p className="text-sm text-ink-muted">
          {SUPPORT_ERRORS['ticket-closed']}{' '}
          <Link href="/support" className="text-accent hover:underline">
            Open a ticket
          </Link>
        </p>
      )}

      {ticket.status !== 'closed' && <CloseTicket reference={reference} />}
    </div>
  );
}
