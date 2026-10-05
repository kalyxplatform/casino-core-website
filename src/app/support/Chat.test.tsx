import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fixtures from '@/test-fixtures/assistant';
import answered from '@/test-fixtures/support/turn-stream-answered.json';
import ticketed from '@/test-fixtures/support/turn-stream-ticketed.json';
import failed from '@/test-fixtures/support/turn-stream-failed.json';
import {
  ASSISTANT_DISCLAIMER,
  ASSISTANT_ERRORS,
  ASSISTANT_LABEL,
  ASSISTANT_PRIVACY_NOTE,
  ASSISTANT_UNAVAILABLE,
  OUTCOME_NOTES,
} from '@/lib/support';
import type { SupportConversation } from '@/lib/webapi';
import { Chat } from '@/app/support/Chat';

// Backend feature 009, T067 / T068 — the chat: one submission id per message, reused
// on a retry (FR-096); text as text (FR-097); a sentence per refusal (FR-098); the
// labels (SEC-M7). The REAL parser and sentences run; the relay is `global.fetch`.

const refresh = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, replace }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const openConversationAction = vi.fn(async () => ({ ok: true, error: null as string | null }));
const closeConversationAction = vi.fn(async () => ({ ok: true, error: null as string | null }));
vi.mock('@/actions/support', () => ({
  openConversationAction: () => openConversationAction(),
  closeConversationAction: () => closeConversationAction(),
}));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface Sent {
  url: string;
  method?: string;
  headers: Record<string, string>;
  body: { submission_id: string; message: string };
  keys: string[];
}
let sent: Sent[] = [];
let answers: (() => Response | Promise<Response>)[] = [];

const json = (body: unknown) => () =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

const frames = (events: { event: string; data: unknown }[]) =>
  events.map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');

const stream = (text: string) => () =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const bytes = new TextEncoder().encode(text);
        // Split mid-frame, as a network would.
        for (let at = 0; at < bytes.length; at += 11) controller.enqueue(bytes.slice(at, at + 11));
        controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } },
  );

/** A stream the test feeds by hand. */
function heldStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    answer: () => new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    push: (text: string) => controller.enqueue(new TextEncoder().encode(text)),
    close: () => controller.close(),
  };
}

const open = fixtures.conversationOpenSuccess.data.conversation as SupportConversation;
const stored = fixtures.conversationReadSuccess.data.conversation as SupportConversation;

const type = (text: string) =>
  fireEvent.change(screen.getByLabelText('Your message to the assistant'), { target: { value: text } });
const input = () => screen.getByLabelText<HTMLTextAreaElement>('Your message to the assistant');
const button = () => screen.getByRole<HTMLButtonElement>('button', { name: /^Send/ });
const press = () => fireEvent.click(button());
const settled = () => waitFor(() => expect(button().disabled).toBe(false));

beforeEach(() => {
  sent = [];
  answers = [];
  refresh.mockReset();
  replace.mockReset();
  openConversationAction.mockClear();
  closeConversationAction.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      sent.push({
        url,
        method: init.method,
        headers: { ...(init.headers as Record<string, string>) },
        body,
        keys: Object.keys(body).sort(),
      });
      const next = answers.shift();
      if (!next) throw new Error('no answer scripted');
      return next();
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Chat — the labels (SEC-M7)', () => {
  it('the header says the answers are automated and not a commitment; the line under the input names the AI service', () => {
    render(<Chat conversation={null} />);
    expect(screen.getByText(ASSISTANT_DISCLAIMER)).toBeTruthy();
    expect(screen.getByText(ASSISTANT_PRIVACY_NOTE)).toBeTruthy();
  });

  it('every assistant-authored entry carries the automated label; the player’s does not', () => {
    render(<Chat conversation={stored} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('You');
    expect(items[0].textContent).not.toContain(ASSISTANT_LABEL);
    expect(items[1].textContent).toContain(ASSISTANT_LABEL);
    expect(items[1].textContent).toContain(stored.messages[1].text);
  });
});

describe('Chat — a turn', () => {
  it('posts ONE JSON request to this site’s relay with exactly submission_id and message', async () => {
    answers = [stream(frames(answered.events))];
    render(<Chat conversation={open} />);
    type('  Where is my win on Dragon Spins?  ');
    press();
    await settled();
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe('/api/support/turn');
    expect(sent[0].method).toBe('POST');
    expect(sent[0].headers).toEqual({ 'Content-Type': 'application/json' });
    expect(sent[0].keys).toEqual(['message', 'submission_id']);
    expect(sent[0].body.message).toBe('Where is my win on Dragon Spins?');
    expect(sent[0].body.submission_id).toMatch(UUID);
    expect(openConversationAction).not.toHaveBeenCalled();
  });

  it('a streamed answer: the status is shown, then cleared; the text arrives; the input empties', async () => {
    const held = heldStream();
    answers = [held.answer];
    render(<Chat conversation={open} />);
    type('Where is my win?');
    press();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    // While the turn runs, a second click cannot send.
    expect(button().disabled).toBe(true);
    press();
    expect(input().value).toBe('');

    await act(async () => held.push(frames([answered.events[0]])));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Checking your recent game activity'));

    await act(async () => held.push(frames([{ event: 'delta', data: { text: 'Your records show ' } }])));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(''));
    await act(async () => held.push(frames([{ event: 'delta', data: { text: 'a bet of 5 SC.' } }])));
    await waitFor(() => expect(screen.getAllByRole('listitem')[1].textContent).toContain('Your records show a bet of 5 SC.'));

    await act(async () => {
      held.push(frames([answered.events[2]]));
      held.close();
    });
    await settled();
    expect(sent).toHaveLength(1);
    expect(screen.getAllByRole('listitem')[0].textContent).toContain('Where is my win?');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('a ticket: the reference is shown as a link to the ticket, and the page re-reads its list', async () => {
    answers = [stream(frames(ticketed.events))];
    render(<Chat conversation={open} />);
    type('I want a refund');
    press();
    await settled();
    const link = screen.getByRole('link', { name: 'T-000124' });
    expect(link.getAttribute('href')).toBe('/support/T-000124');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('listitem')[1].textContent).toContain('I have opened ticket T-000124');
  });

  it('a reference that is not one is never made into a link', async () => {
    answers = [
      stream(
        frames([
          { event: 'ticket', data: { reference: '../../login?x=T-000124' } },
          { event: 'done', data: { turn_no: 1, outcome: 'ticketed' } },
        ]),
      ),
    ];
    render(<Chat conversation={open} />);
    type('hello');
    press();
    await settled();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('FR-097: markup and addresses in an answer stay TEXT — nothing is parsed, nothing is linked', async () => {
    const hostile = '<img src=x onerror="alert(1)"><script>alert(2)</script><b>bold</b> https://evil.test [x](https://evil.test)';
    answers = [
      stream(
        frames([
          { event: 'status', data: { tool: 'get_balances', label: '<i>label</i>' } },
          { event: 'delta', data: { text: hostile } },
          { event: 'done', data: { turn_no: 1, outcome: 'answered' } },
        ]),
      ),
    ];
    const { container } = render(<Chat conversation={open} />);
    type('<u>mine</u>');
    press();
    await settled();
    for (const tag of ['img', 'script', 'b', 'i', 'u', 'a']) expect(container.querySelector(tag)).toBeNull();
    expect(container.textContent).toContain(hostile);
    expect(container.textContent).toContain('<u>mine</u>');
    const answer = screen.getAllByRole('listitem')[1].querySelector('p');
    expect(answer?.className).toContain('whitespace-pre-wrap');
  });

  it('an error event: the text already shown stays, the turn is marked failed, the notice points at the form', async () => {
    answers = [stream(frames(failed.events))];
    render(<Chat conversation={open} />);
    type('hello');
    press();
    await settled();
    const answer = screen.getAllByRole('listitem')[1].textContent ?? '';
    expect(answer).toContain('Let me check');
    expect(answer).toContain(OUTCOME_NOTES.failed);
    expect(screen.getByText(ASSISTANT_UNAVAILABLE)).toBeTruthy();
  });

  it('a stream that ends with neither done nor error ⇒ the conversation is re-read', async () => {
    answers = [stream(frames([{ event: 'delta', data: { text: 'Let me ' } }]))];
    render(<Chat conversation={open} />);
    type('hello');
    press();
    await settled();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/connection was lost/i)).toBeTruthy();
  });

  it('the server’s re-read replaces what the chat holds once no turn is running', async () => {
    answers = [stream(frames([{ event: 'delta', data: { text: 'Let me ' } }]))];
    const { rerender } = render(<Chat conversation={open} />);
    type('hello');
    press();
    await settled();
    rerender(<Chat conversation={{ ...stored }} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[1].textContent).toContain(stored.messages[1].text);
  });
});

describe('Chat — one submission id per message (FR-096)', () => {
  it('a refusal keeps the message and the id: the retry carries the SAME id', async () => {
    answers = [json(fixtures.supportBusy), json(fixtures.turnInProgress), stream(frames(answered.events))];
    render(<Chat conversation={open} />);
    type('Where is my win?');
    press();
    await settled();
    expect(screen.getByText(ASSISTANT_ERRORS['support-busy'])).toBeTruthy();
    expect(input().value).toBe('Where is my win?');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    press();
    await settled();
    expect(screen.getByText(ASSISTANT_ERRORS['turn-in-progress'])).toBeTruthy();
    press();
    await settled();
    expect(sent).toHaveLength(3);
    expect(new Set(sent.map((call) => call.body.submission_id)).size).toBe(1);
  });

  it('a request lost in transit keeps the id: sending again is a replay, not a second turn', async () => {
    answers = [() => Promise.reject(new TypeError('Failed to fetch')), json(fixtures.turnReplaySuccess)];
    render(<Chat conversation={open} />);
    type('I want a refund');
    press();
    await settled();
    expect(input().value).toBe('I want a refund');
    press();
    await settled();
    expect(sent[1].body.submission_id).toBe(sent[0].body.submission_id);
    // The replay is shown as the stored turn: the message, its answer, its ticket.
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('I want a refund');
    expect(items[1].textContent).toContain(fixtures.turnReplaySuccess.data.answer);
    expect(screen.getByRole('link', { name: 'T-000124' })).toBeTruthy();
    expect(input().value).toBe('');
  });

  it('a replay of a turn the page already shows adds nothing twice', async () => {
    answers = [json({ ...fixtures.turnReplaySuccess, data: { ...fixtures.turnReplaySuccess.data, turn_no: 1 } })];
    render(<Chat conversation={stored} />);
    type('Where is my win on Dragon Spins?');
    press();
    await settled();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('an interrupted replay says so', async () => {
    answers = [json(fixtures.turnReplayInterrupted)];
    render(<Chat conversation={open} />);
    type('hello');
    press();
    await settled();
    expect(screen.getAllByRole('listitem')[1].textContent).toContain(OUTCOME_NOTES.interrupted);
  });

  it('a new message gets a new id; so does different text after a refusal', async () => {
    answers = [
      stream(frames(answered.events)),
      json(fixtures.supportBusy),
      stream(frames(answered.events)),
    ];
    render(<Chat conversation={open} />);
    type('first');
    press();
    await settled();
    type('second');
    press();
    await settled();
    type('second, reworded');
    press();
    await settled();
    const ids = sent.map((call) => call.body.submission_id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(UUID);
  });

  it('the same text sent again AFTER its turn finished is a new message', async () => {
    answers = [stream(frames(answered.events)), stream(frames(answered.events))];
    render(<Chat conversation={open} />);
    type('again');
    press();
    await settled();
    type('again');
    press();
    await settled();
    expect(sent[1].body.submission_id).not.toBe(sent[0].body.submission_id);
  });

  it('submission-rejected ⇒ the next send mints a new id', async () => {
    answers = [json(fixtures.submissionRejected), stream(frames(answered.events))];
    render(<Chat conversation={open} />);
    type('hello');
    press();
    await settled();
    expect(screen.getByText(ASSISTANT_ERRORS['submission-rejected'])).toBeTruthy();
    press();
    await settled();
    expect(sent[1].body.submission_id).not.toBe(sent[0].body.submission_id);
  });
});

describe('Chat — refusals (FR-098)', () => {
  it.each([
    ['support-limit', fixtures.supportLimit, ASSISTANT_ERRORS['support-limit']],
    ['support-unavailable', fixtures.supportUnavailable, ASSISTANT_UNAVAILABLE],
    ['assistant-disabled', fixtures.assistantDisabled, ASSISTANT_UNAVAILABLE],
    ['the pre-ship 404', { code: 404, message: 'not-found' }, ASSISTANT_UNAVAILABLE],
    ['a 400', fixtures.turnInvalid, fixtures.turnInvalid.message],
    ['an answer with no sentence', { code: 415, message: 'something-new' }, 'Your message could not be sent right now. Try again shortly.'],
    ['the relay’s own refusal', { code: 400, message: 'request-refused' }, 'Your message could not be sent right now. Try again shortly.'],
  ])('%s ⇒ a sentence, never the slug, and the message is kept', async (_name, answer, sentence) => {
    answers = [json(answer)];
    render(<Chat conversation={open} />);
    type('hello');
    press();
    await settled();
    expect(screen.getByText(sentence)).toBeTruthy();
    expect(input().value).toBe('hello');
  });

  it('403 ⇒ the login page', async () => {
    answers = [json({ code: 403 })];
    render(<Chat conversation={open} />);
    type('hello');
    press();
    await settled();
    expect(replace).toHaveBeenCalledWith('/login');
  });
});

describe('Chat — the conversation', () => {
  it('with none open, the first send opens one BEFORE the turn', async () => {
    answers = [stream(frames(answered.events))];
    render(<Chat conversation={null} />);
    type('hello');
    press();
    await settled();
    expect(openConversationAction).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(1);
  });

  it('opening refused ⇒ its sentence, and no turn is sent', async () => {
    openConversationAction.mockResolvedValueOnce({ ok: false, error: ASSISTANT_UNAVAILABLE });
    render(<Chat conversation={null} />);
    type('hello');
    press();
    await settled();
    expect(screen.getByText(ASSISTANT_UNAVAILABLE)).toBeTruthy();
    expect(sent).toEqual([]);
    expect(input().value).toBe('hello');
  });

  it('conversation-closed ⇒ the retry opens a new one and carries the same id', async () => {
    answers = [json(fixtures.conversationClosed), stream(frames(answered.events))];
    render(<Chat conversation={stored} />);
    type('hello');
    press();
    await settled();
    expect(screen.getByText(ASSISTANT_ERRORS['conversation-closed'])).toBeTruthy();
    expect(openConversationAction).not.toHaveBeenCalled();
    press();
    await settled();
    expect(openConversationAction).toHaveBeenCalledTimes(1);
    expect(sent[1].body.submission_id).toBe(sent[0].body.submission_id);
    // The ended conversation's messages are gone; the new turn is what is shown.
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('End conversation closes it and empties the chat', async () => {
    render(<Chat conversation={stored} />);
    fireEvent.click(screen.getByRole('button', { name: 'End conversation' }));
    await waitFor(() => expect(screen.queryAllByRole('listitem')).toHaveLength(0));
    expect(closeConversationAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'End conversation' })).toBeNull();
  });
});
