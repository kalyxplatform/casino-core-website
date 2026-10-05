import Link from 'next/link';
import { Suspense } from 'react';
import { redirectToExpiredSession, requireSession } from '@/lib/session';
import * as webapi from '@/lib/webapi';
import {
  ASSISTANT_UNAVAILABLE,
  SUPPORT_UNAVAILABLE,
  assistantAvailability,
  categoryLabel,
  formatInstant,
  isReference,
  statusLabel,
  supportAvailability,
} from '@/lib/support';
import { AppShell } from '@/components/AppShell';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';
import { Chat } from './Chat';
import { TicketForm } from './TicketForm';

/**
 * Backend feature 008 — open a ticket, and the player's tickets.
 *
 * `GET /support/tickets` is one player's, read on the server on every render,
 * `no-store`, and never logged. It also carries the brand's categories, which is
 * all the form needs. A brand without support (`415 support-disabled`) — or a
 * `webapi` that has not shipped the routes (a `404` that is not
 * `ticket-not-found`) — shows the notice and no form (FR-062).
 *
 * Subjects are the player's own text: React text children, never markup.
 *
 * Backend feature 009 — the assistant's chat sits above the form. Its
 * conversation is read here, on the server (`GET /support/conversation`,
 * `no-store`, never logged), and handed to the client component; the two reads
 * stream independently, so a slow one never holds the other back.
 */
export default async function SupportPage() {
  const session = await requireSession();

  return (
    <AppShell player={session.player} current="support">
      <h1 className="text-xl font-semibold tracking-tight">Support</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Ask about your account, a game or a purchase. We reply here.
      </p>

      {/* No fallback: a brand without the assistant must not flash a chat-shaped skeleton. */}
      <Suspense fallback={null}>
        <Assistant token={session.token} />
      </Suspense>

      <Suspense fallback={<SupportFallback />}>
        <Tickets token={session.token} />
      </Suspense>
    </AppShell>
  );
}

function SupportFallback() {
  return (
    <SkeletonRegion label="Loading support">
      <div className="mt-5 space-y-3">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={1} />
      </div>
    </SkeletonRegion>
  );
}

/**
 * The chat, when the brand has the assistant.
 *
 * - `415 assistant-disabled` — tickets and no assistant: the form and NO chat.
 * - `415 support-disabled`, or a `404` from a `webapi` that has not shipped the
 *   routes — no chat either; `Tickets` below says what there is to say.
 * - any other failure — a notice, with the ticket form usable below it (FR-098).
 */
async function Assistant({ token }: { token: string }) {
  const answer = await webapi.readSupportConversation(token);
  const availability = assistantAvailability(answer);

  if (availability === 'signed-out') redirectToExpiredSession();
  if (availability === 'unavailable' || availability === 'no-assistant') return null;

  if (availability !== 'ok' || !answer.data) {
    return (
      <p className="mt-5 rounded-xl border border-edge bg-surface px-4 py-4 text-sm text-ink-muted">
        {ASSISTANT_UNAVAILABLE}
      </p>
    );
  }

  return (
    <div className="mt-5">
      <Chat conversation={answer.data.conversation ?? null} />
    </div>
  );
}

async function Tickets({ token }: { token: string }) {
  const answer = await webapi.listSupportTickets(token);
  const availability = supportAvailability(answer);

  if (availability === 'signed-out') redirectToExpiredSession();

  if (availability === 'unavailable') {
    return (
      <p className="mt-5 rounded-xl border border-edge bg-surface px-4 py-6 text-center text-sm text-ink-muted">
        {SUPPORT_UNAVAILABLE}
      </p>
    );
  }

  if (availability !== 'ok' || !answer.data) {
    return (
      <p className="mt-5 text-sm text-danger">
        Your tickets could not be loaded right now. Try again shortly.
      </p>
    );
  }

  const { categories, tickets } = answer.data;

  return (
    <div className="mt-5 space-y-8">
      <section className="rounded-xl border border-edge bg-surface p-5">
        <h2 className="text-base font-semibold tracking-tight">Open a ticket</h2>
        <TicketForm categories={categories} />
      </section>

      <section>
        <h2 className="text-base font-semibold tracking-tight">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">You have no tickets yet.</p>
        ) : (
          // Newest first, as the backend sends them.
          <ul className="mt-3 divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-surface">
            {tickets.filter((ticket) => isReference(ticket.reference)).map((ticket) => (
              <li key={ticket.reference}>
                <Link
                  href={`/support/${encodeURIComponent(ticket.reference)}`}
                  className="block px-4 py-3 transition hover:bg-surface-raised"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-sm font-medium">{ticket.subject}</span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {statusLabel(ticket.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-ink-muted">
                    {ticket.reference} · {categoryLabel(ticket.category)} · updated{' '}
                    {formatInstant(ticket.updated_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
