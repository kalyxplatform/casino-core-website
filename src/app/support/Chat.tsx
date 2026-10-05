'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { closeConversationAction, openConversationAction } from '@/actions/support';
import {
  ASSISTANT_DISCLAIMER,
  ASSISTANT_ERRORS,
  ASSISTANT_FAILED,
  ASSISTANT_LABEL,
  ASSISTANT_PRIVACY_NOTE,
  ASSISTANT_UNAVAILABLE,
  OUTCOME_NOTES,
  assistantAvailability,
  isReference,
  isTurnOutcome,
} from '@/lib/support';
import { createTurnParser, type TurnEvent } from '@/lib/turn-events';
import type { SupportConversation, SupportTurnOutcome } from '@/lib/webapi';
import { Alert } from '@/components/Alert';

/**
 * Backend feature 009 — the support assistant's chat on `/support`.
 *
 * One message is one `POST /api/support/turn` to THIS site; the relay there holds
 * the session token and the brand key. The answer is one of two content types:
 *
 * - JSON — a refusal (a sentence saying what to do next, FR-098), or the REPLAY of
 *   a submission seen before (its stored answer);
 * - an event stream — the turn was admitted: `status` lines while a lookup runs,
 *   `delta` text as it is written, a `ticket` reference, then `done` or `error`.
 *   A stream that ends with neither was cut off, and the page re-reads the
 *   conversation.
 *
 * ONE submission id per message (FR-096): minted in the browser when the message
 * is first sent, kept in a ref, and REUSED for the same text until the turn has an
 * answer — so a retry after a refusal, or after the request was lost in transit,
 * is a replay and never a second turn (or a second ticket). A double click sends
 * one request: the button is disabled and a ref guards the handler.
 *
 * Text is text (FR-097). The assistant's words, the player's and a status label
 * are React text children in a `whitespace-pre-wrap` element: nothing is parsed
 * as markup and nothing is auto-linked. The one link here is to a ticket this
 * page builds from a reference it has checked.
 *
 * Nothing is logged and nothing is stored in the browser.
 */

interface Entry {
  key: string;
  role: 'player' | 'assistant';
  text: string;
  turnNo: number | null;
  outcome: SupportTurnOutcome | null;
  ticket: string | null;
  /** The answer is still being written. */
  pending: boolean;
}

const MESSAGE_MAX = 2000;

const CUT_OFF = 'The connection was lost before the answer finished. This is the conversation so far.';

const entriesOf = (conversation: SupportConversation | null): Entry[] =>
  (conversation?.messages ?? []).map((message) => ({
    key: `${message.role}-${message.turn_no}`,
    role: message.role === 'player' ? 'player' : 'assistant',
    text: typeof message.text === 'string' ? message.text : '',
    turnNo: message.turn_no,
    outcome: isTurnOutcome(message.outcome) ? message.outcome : null,
    ticket: isReference(message.ticket_reference) ? message.ticket_reference : null,
    pending: false,
  }));

/** A lower-case UUID. `randomUUID` is missing on an insecure origin; `getRandomValues` is not. */
function mintSubmissionId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function Chat({ conversation }: { conversation: SupportConversation | null }) {
  const router = useRouter();
  const [seen, setSeen] = useState(conversation);
  const [entries, setEntries] = useState<Entry[]>(() => entriesOf(conversation));
  const [open, setOpen] = useState(conversation !== null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  /** Guards the handlers: state lags a double click, a ref does not. */
  const busy = useRef(false);
  /** The id of the message being sent, and the text it belongs to (FR-096). */
  const submission = useRef<{ id: string; text: string } | null>(null);
  const list = useRef<HTMLOListElement>(null);

  // The server re-read the conversation (a refresh). While a turn runs, what this
  // component holds is newer than what the server stored, so it keeps its own.
  if (conversation !== seen) {
    setSeen(conversation);
    if (!running) {
      setEntries(entriesOf(conversation));
      setOpen(conversation !== null);
    }
  }

  useEffect(() => {
    const element = list.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [entries, status]);

  const patch = (key: string, change: (entry: Entry) => Entry) =>
    setEntries((current) => current.map((entry) => (entry.key === key ? change(entry) : entry)));

  /** A JSON answer: a replay, or a refusal as a sentence. */
  function readAnswer(answer: { code?: unknown; message?: unknown; data?: unknown }, text: string) {
    const code = typeof answer.code === 'number' ? answer.code : 500;
    const message = typeof answer.message === 'string' ? answer.message : undefined;

    if (code === 403) {
      // The relay has dropped the cookie; the session is gone.
      router.replace('/login');
      return;
    }

    const data = answer.data as Record<string, unknown> | null | undefined;
    if (code === 200 && data && data.replayed === true) {
      // This submission already has its outcome: show it, never send it again.
      submission.current = null;
      setDraft('');
      const turnNo = typeof data.turn_no === 'number' ? data.turn_no : null;
      const replayed: Entry = {
        key: `assistant-${turnNo ?? 'replay'}`,
        role: 'assistant',
        text: typeof data.answer === 'string' ? data.answer : '',
        turnNo,
        outcome: isTurnOutcome(data.outcome) ? data.outcome : null,
        ticket: isReference(data.ticket_reference) ? data.ticket_reference : null,
        pending: false,
      };
      setEntries((current) => {
        const has = (role: Entry['role']) =>
          turnNo !== null && current.some((entry) => entry.role === role && entry.turnNo === turnNo);
        const next = [...current];
        if (!has('player')) {
          next.push({
            key: `player-${turnNo ?? 'replay'}`,
            role: 'player',
            text,
            turnNo,
            outcome: null,
            ticket: null,
            pending: false,
          });
        }
        if (!has('assistant')) next.push(replayed);
        return next;
      });
      if (replayed.ticket) router.refresh();
      return;
    }

    const availability = assistantAvailability({ code, message });
    if (availability === 'unavailable' || availability === 'no-assistant') {
      setNotice(ASSISTANT_UNAVAILABLE);
      return;
    }
    // A `400`'s one message is the rule's text, never the value; the relay's own refusal has no rule to show.
    if (code === 400 && message && message !== 'request-refused') {
      setNotice(message);
      return;
    }
    if (message === 'submission-rejected') submission.current = null;
    if (message === 'conversation-closed') setOpen(false);
    setNotice(ASSISTANT_ERRORS[message ?? ''] ?? ASSISTANT_FAILED);
  }

  /** An admitted turn: read the stream to its end. */
  async function readStream(body: ReadableStream<Uint8Array>, id: string, text: string) {
    const answerKey = `answer-${id}`;
    setDraft('');
    setEntries((current) => [
      ...current,
      { key: `message-${id}`, role: 'player', text, turnNo: null, outcome: null, ticket: null, pending: false },
      { key: answerKey, role: 'assistant', text: '', turnNo: null, outcome: null, ticket: null, pending: true },
    ]);

    const apply = (event: TurnEvent) => {
      switch (event.event) {
        case 'status':
          setStatus(event.data.label);
          break;
        case 'delta':
          setStatus(null);
          patch(answerKey, (entry) => ({ ...entry, text: entry.text + event.data.text }));
          break;
        case 'ticket':
          if (isReference(event.data.reference)) {
            const reference = event.data.reference;
            patch(answerKey, (entry) => ({ ...entry, ticket: reference }));
          }
          // The list of tickets below is the server's: re-read it.
          router.refresh();
          break;
        case 'done': {
          const { outcome, turn_no: turnNo } = event.data;
          setStatus(null);
          patch(answerKey, (entry) => ({
            ...entry,
            turnNo,
            outcome: isTurnOutcome(outcome) ? outcome : null,
            pending: false,
          }));
          break;
        }
        case 'error':
          // The turn is stored as failed; the text already shown stays.
          setStatus(null);
          patch(answerKey, (entry) => ({ ...entry, outcome: 'failed', pending: false }));
          setNotice(ASSISTANT_ERRORS[event.data.reason] ?? ASSISTANT_UNAVAILABLE);
          break;
      }
    };

    const parser = createTurnParser();
    const reader = body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const event of parser.push(value)) apply(event);
      }
    } catch {
      // A broken connection is a body that ended early.
    }

    // The turn was admitted, so this id is spent whatever happened next.
    submission.current = null;
    if (parser.finish().cutOff) {
      setStatus(null);
      patch(answerKey, (entry) => ({ ...entry, pending: false }));
      setNotice(CUT_OFF);
      // The turn may be stored, or still running: what the server holds is the truth.
      router.refresh();
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (text === '' || busy.current) return;
    busy.current = true;
    setRunning(true);
    setNotice(null);
    setStatus(null);

    // The same text again is the same message: the same id, so a retry is a replay.
    if (submission.current?.text !== text) submission.current = { id: mintSubmissionId(), text };
    const { id } = submission.current;

    try {
      if (!open) {
        const opened = await openConversationAction();
        if (!opened.ok) {
          setNotice(opened.error ?? ASSISTANT_FAILED);
          return;
        }
        setEntries([]);
        setOpen(true);
      }

      let response: Response;
      try {
        response = await fetch('/api/support/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: id, message: text }),
        });
      } catch {
        // Nobody knows whether it arrived. The id is kept: sending again is a replay.
        setNotice(ASSISTANT_FAILED);
        return;
      }

      const type = response.headers.get('content-type') ?? '';
      if (type.startsWith('text/event-stream') && response.body) {
        await readStream(response.body, id, text);
        return;
      }
      let answer: { code?: unknown; message?: unknown; data?: unknown };
      try {
        answer = (await response.json()) as typeof answer;
      } catch {
        setNotice(ASSISTANT_FAILED);
        return;
      }
      readAnswer(answer ?? {}, text);
    } catch {
      setNotice(ASSISTANT_FAILED);
    } finally {
      busy.current = false;
      setRunning(false);
      setStatus(null);
    }
  }

  async function end() {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    setNotice(null);
    try {
      const closed = await closeConversationAction();
      if (closed.ok) {
        submission.current = null;
        setEntries([]);
        setOpen(false);
      } else {
        setNotice(closed.error ?? ASSISTANT_FAILED);
      }
    } catch {
      setNotice(ASSISTANT_FAILED);
    } finally {
      busy.current = false;
      setRunning(false);
    }
  }

  return (
    <section aria-labelledby="assistant-heading" className="rounded-xl border border-edge bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="assistant-heading" className="text-base font-semibold tracking-tight">
          Ask the assistant
        </h2>
        {open && entries.length > 0 && (
          <button
            type="button"
            onClick={end}
            disabled={running}
            className="shrink-0 text-xs text-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            End conversation
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-muted">{ASSISTANT_DISCLAIMER}</p>

      {conversation?.messages_truncated && (
        <p className="mt-3 text-xs text-ink-muted">Older messages in this conversation are not shown.</p>
      )}

      {entries.length > 0 && (
        <ol ref={list} aria-label="Conversation" className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
          {entries.map((entry) => {
            const note = entry.outcome ? OUTCOME_NOTES[entry.outcome] : null;
            return (
              <li
                key={entry.key}
                className={`rounded-xl border border-edge p-4 ${
                  entry.role === 'player' ? 'bg-surface' : 'bg-surface-raised'
                }`}
              >
                <div className="text-xs font-medium text-ink">
                  {entry.role === 'player' ? 'You' : ASSISTANT_LABEL}
                </div>
                {entry.text !== '' && (
                  <p className="mt-2 text-sm whitespace-pre-wrap break-words">{entry.text}</p>
                )}
                {entry.pending && entry.text === '' && status === null && (
                  <p className="mt-2 text-sm text-ink-muted">Thinking…</p>
                )}
                {entry.ticket && (
                  <p className="mt-2 text-xs text-ink-muted">
                    Ticket opened:{' '}
                    <Link href={`/support/${encodeURIComponent(entry.ticket)}`} className="text-accent hover:underline">
                      {entry.ticket}
                    </Link>
                  </p>
                )}
                {note && <p className="mt-2 text-xs text-ink-muted">{note}</p>}
              </li>
            );
          })}
        </ol>
      )}

      <p role="status" aria-live="polite" className="mt-3 min-h-4 text-xs text-ink-muted">
        {status}
      </p>

      {notice && (
        <div className="mt-2">
          <Alert tone="error">{notice}</Alert>
        </div>
      )}

      <form onSubmit={send} className="mt-3 space-y-3">
        <label className="block">
          <span className="sr-only">Your message to the assistant</span>
          <textarea
            name="message"
            required
            maxLength={MESSAGE_MAX}
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about a game round, a purchase or your account"
            className="field resize-y"
          />
        </label>
        <button
          type="submit"
          disabled={running}
          className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? 'Sending…' : 'Send'}
        </button>
        <p className="text-xs text-ink-muted">{ASSISTANT_PRIVACY_NOTE}</p>
      </form>
    </section>
  );
}
