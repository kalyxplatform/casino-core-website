import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fixtures from '@/test-fixtures/support';

// Backend feature 008, US5 (T044) — the server side of /support against the contracts.
//
// The REAL `webapi.ts`, the REAL actions and the REAL `lib/support.ts` run here; only
// the cookie, `redirect`/`refresh` and the network are replaced. Upstream is
// `global.fetch`, so every request that would leave this server is observed
// exactly — including that none of it is cached or logged (SEC-M12).

vi.mock('server-only', () => ({}));
let session: { token: string; player: unknown } | null = null;
vi.mock('@/lib/session', () => ({
  readSession: async () => session,
  writeSession: async () => undefined,
  clearSession: async () => undefined,
}));
class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect ${to}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));
const refresh = vi.fn();
vi.mock('next/cache', () => ({ refresh: () => refresh() }));

const BRAND_KEY = 'brand-key-from-the-server-env';
const WEBAPI = 'https://webapi.test';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  cache?: RequestCache;
  next?: unknown;
}
let calls: Call[] = [];
/** Answers by `METHOD path`; HTTP status is part of the answer, as the backend's filter sends it. */
let routes: Record<string, { status?: number; body: unknown }> = {};

const consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

beforeEach(() => {
  vi.resetModules();
  process.env.BRAND_KEY = BRAND_KEY;
  process.env.WEBAPI_BASE_URL = WEBAPI;
  session = { token: 'the-session-token', player: { user_id: 7 } };
  calls = [];
  routes = {};
  refresh.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit & { next?: unknown }) => {
      const path = url.slice(WEBAPI.length);
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: { ...(init.headers as Record<string, string>) },
        body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
        cache: init.cache,
        next: init.next,
      });
      const answer = routes[`${init.method ?? 'GET'} ${path}`] ?? {
        status: 404,
        body: { code: 404, message: `Route ${init.method ?? 'GET'}:${path} not found`, error: 'Not Found' },
      };
      return new Response(JSON.stringify(answer.body), {
        status: answer.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    consoleSpies.push(vi.spyOn(console, method).mockImplementation(() => undefined));
  }
});

afterEach(() => {
  // Nothing is ever logged: not a ticket, not a message, not a refusal.
  for (const spy of consoleSpies.splice(0)) {
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  }
  // And nothing support-shaped is ever cached: every call is one player's.
  for (const call of calls) {
    expect(call.url.startsWith(`${WEBAPI}/support/`)).toBe(true);
    expect(call.cache).toBe('no-store');
    expect(call.next).toBeUndefined();
    expect(call.headers['X-Brand-Key']).toBe(BRAND_KEY);
    expect(call.headers.Authorization).toBe('Bearer the-session-token');
  }
  vi.unstubAllGlobals();
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

const actions = () => import('@/actions/support');
const states = () => import('@/lib/support');

const ticketForm = (submissionId = fixtures.ticketCreateRequest.submission_id) =>
  form({
    submissionId,
    category: fixtures.ticketCreateRequest.category,
    subject: fixtures.ticketCreateRequest.subject,
    message: fixtures.ticketCreateRequest.message,
  });

const replyForm = (reference = 'T-000123', submissionId = fixtures.ticketCommentRequest.submission_id) =>
  form({ reference, submissionId, message: fixtures.ticketCommentRequest.message });

describe('createTicketAction', () => {
  it('no session ⇒ /login, and nothing is sent', async () => {
    session = null;
    const { createTicketAction } = await actions();
    const { emptyTicketForm } = await states();
    await expect(createTicketAction(emptyTicketForm, ticketForm())).rejects.toThrow('redirect /login');
    expect(calls).toEqual([]);
  });

  it('success ⇒ sends EXACTLY ticket-create-request.json and goes to /support/<reference>', async () => {
    routes['POST /support/tickets'] = { body: fixtures.ticketCreateSuccess };
    const { createTicketAction } = await actions();
    const { emptyTicketForm } = await states();
    await expect(createTicketAction(emptyTicketForm, ticketForm())).rejects.toThrow(
      'redirect /support/T-000123',
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ url: `${WEBAPI}/support/tickets`, method: 'POST' });
    expect(calls[0].body).toStrictEqual(fixtures.ticketCreateRequest);
  });

  it('a success whose reference is not one ⇒ an error, never a redirect to it', async () => {
    routes['POST /support/tickets'] = { body: { code: 200, message: 'ok', data: { reference: '../x' } } };
    const { createTicketAction } = await actions();
    const { emptyTicketForm } = await states();
    const state = await createTicketAction(emptyTicketForm, ticketForm());
    expect(state.error).toBeTruthy();
  });

  it('400 ⇒ the backend\'s one message, the form values back and the SAME submission_id', async () => {
    routes['POST /support/tickets'] = { body: fixtures.ticketInvalid };
    const { createTicketAction } = await actions();
    const { emptyTicketForm } = await states();
    const state = await createTicketAction(emptyTicketForm, ticketForm());
    expect(state).toStrictEqual({
      error: fixtures.ticketInvalid.message,
      submissionId: fixtures.ticketCreateRequest.submission_id,
      values: {
        category: fixtures.ticketCreateRequest.category,
        subject: fixtures.ticketCreateRequest.subject,
        message: fixtures.ticketCreateRequest.message,
      },
    });
  });

  it('415 submission-rejected ⇒ a NEW submission_id and "send that again"', async () => {
    routes['POST /support/tickets'] = { body: fixtures.submissionRejected };
    const { createTicketAction } = await actions();
    const { emptyTicketForm, SUPPORT_ERRORS } = await states();
    const state = await createTicketAction(emptyTicketForm, ticketForm());
    expect(state.submissionId).toMatch(UUID);
    expect(state.submissionId).not.toBe(fixtures.ticketCreateRequest.submission_id);
    expect(state.error).toBe(SUPPORT_ERRORS['submission-rejected']);
    expect(state.values.subject).toBe(fixtures.ticketCreateRequest.subject);
  });

  it.each([
    ['support-busy', fixtures.supportBusy],
    ['ticket-limit', fixtures.ticketLimit],
  ])('415 %s ⇒ its sentence and the SAME submission_id', async (slug, body) => {
    routes['POST /support/tickets'] = { body };
    const { createTicketAction } = await actions();
    const { emptyTicketForm, SUPPORT_ERRORS } = await states();
    const state = await createTicketAction(emptyTicketForm, ticketForm());
    expect(state.error).toBe(SUPPORT_ERRORS[slug]);
    expect(state.submissionId).toBe(fixtures.ticketCreateRequest.submission_id);
  });

  it('a form with no submission id (no script ran) gets one minted and returned for the retry', async () => {
    routes['POST /support/tickets'] = { body: fixtures.supportBusy };
    const { createTicketAction } = await actions();
    const { emptyTicketForm } = await states();
    const state = await createTicketAction(emptyTicketForm, ticketForm(''));
    expect(calls[0].body).toMatchObject({ submission_id: expect.stringMatching(UUID) });
    expect(state.submissionId).toBe((calls[0].body as { submission_id: string }).submission_id);
  });

  it('403 ⇒ /login', async () => {
    routes['POST /support/tickets'] = { body: fixtures.unauthorized };
    const { createTicketAction } = await actions();
    const { emptyTicketForm } = await states();
    await expect(createTicketAction(emptyTicketForm, ticketForm())).rejects.toThrow('redirect /login');
  });

  it.each([
    ['415 support-disabled', { body: fixtures.supportDisabled }],
    ['HTTP 404 (not shipped)', { status: 404, body: fixtures.routeNotFound }],
  ])('%s ⇒ "Support is not available."', async (_name, answer) => {
    routes['POST /support/tickets'] = answer;
    const { createTicketAction } = await actions();
    const { emptyTicketForm } = await states();
    const state = await createTicketAction(emptyTicketForm, ticketForm());
    expect(state.error).toBe('Support is not available.');
  });

  it('an outage ⇒ a generic sentence, the same id, the values kept', async () => {
    routes['POST /support/tickets'] = { body: { code: 500, message: 'Internal server error' } };
    const { createTicketAction } = await actions();
    const { emptyTicketForm } = await states();
    const state = await createTicketAction(emptyTicketForm, ticketForm());
    expect(state.error).not.toContain('Internal');
    expect(state.submissionId).toBe(fixtures.ticketCreateRequest.submission_id);
    expect(state.values.message).toBe(fixtures.ticketCreateRequest.message);
  });
});

describe('replyAction', () => {
  it.each(['../x', 'T-000123/close', 'T-123', '', 'T-000123?admin=1'])(
    'reference %j never reaches webapi',
    async (reference) => {
      const { replyAction } = await actions();
      const { emptyReply } = await states();
      const state = await replyAction(emptyReply, replyForm(reference));
      expect(calls).toEqual([]);
      expect(state.error).toBeTruthy();
    },
  );

  it('no session ⇒ /login, and nothing is sent', async () => {
    session = null;
    const { replyAction } = await actions();
    const { emptyReply } = await states();
    await expect(replyAction(emptyReply, replyForm())).rejects.toThrow('redirect /login');
    expect(calls).toEqual([]);
  });

  it('success ⇒ EXACTLY ticket-comment-request.json, the page re-read, a fresh id for the next reply', async () => {
    routes['POST /support/tickets/T-000123/comments'] = { body: fixtures.ticketCommentSuccess };
    const { replyAction } = await actions();
    const { emptyReply } = await states();
    const state = await replyAction(emptyReply, replyForm());
    expect(calls[0]).toMatchObject({
      url: `${WEBAPI}/support/tickets/T-000123/comments`,
      method: 'POST',
    });
    expect(calls[0].body).toStrictEqual(fixtures.ticketCommentRequest);
    expect(refresh).toHaveBeenCalledOnce();
    expect(state.error).toBeNull();
    expect(state.submissionId).toMatch(UUID);
    expect(state.submissionId).not.toBe(fixtures.ticketCommentRequest.submission_id);
    expect(state.values.message).toBe('');
    // The answer is not handed back whole: the page re-reads.
    expect(Object.keys(state).sort()).toEqual(['error', 'submissionId', 'values']);
  });

  it('400 ⇒ the message as given, the text kept, the same id', async () => {
    routes['POST /support/tickets/T-000123/comments'] = {
      body: { code: 400, message: 'message must be longer than or equal to 1 characters' },
    };
    const { replyAction } = await actions();
    const { emptyReply } = await states();
    const state = await replyAction(emptyReply, replyForm());
    expect(state).toStrictEqual({
      error: 'message must be longer than or equal to 1 characters',
      submissionId: fixtures.ticketCommentRequest.submission_id,
      values: { message: fixtures.ticketCommentRequest.message },
    });
  });

  it('415 submission-rejected ⇒ a NEW id', async () => {
    routes['POST /support/tickets/T-000123/comments'] = { body: fixtures.submissionRejected };
    const { replyAction } = await actions();
    const { emptyReply, SUPPORT_ERRORS } = await states();
    const state = await replyAction(emptyReply, replyForm());
    expect(state.error).toBe(SUPPORT_ERRORS['submission-rejected']);
    expect(state.submissionId).toMatch(UUID);
    expect(state.submissionId).not.toBe(fixtures.ticketCommentRequest.submission_id);
  });

  it.each([
    ['support-busy', fixtures.supportBusy],
    ['ticket-closed', fixtures.ticketClosed],
    ['comment-limit', fixtures.commentLimit],
    ['ticket-limit', fixtures.ticketLimit],
  ])('415 %s ⇒ its sentence, the same id', async (slug, body) => {
    routes['POST /support/tickets/T-000123/comments'] = { body };
    const { replyAction } = await actions();
    const { emptyReply, SUPPORT_ERRORS } = await states();
    const state = await replyAction(emptyReply, replyForm());
    expect(state.error).toBe(SUPPORT_ERRORS[slug]);
    expect(state.submissionId).toBe(fixtures.ticketCommentRequest.submission_id);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('404 ticket-not-found ⇒ a sentence, not the slug', async () => {
    routes['POST /support/tickets/T-000123/comments'] = { body: fixtures.ticketNotFound };
    const { replyAction } = await actions();
    const { emptyReply } = await states();
    const state = await replyAction(emptyReply, replyForm());
    expect(state.error).toBeTruthy();
    expect(state.error).not.toContain('ticket-not-found');
  });

  it('403 ⇒ /login', async () => {
    routes['POST /support/tickets/T-000123/comments'] = { body: fixtures.unauthorized };
    const { replyAction } = await actions();
    const { emptyReply } = await states();
    await expect(replyAction(emptyReply, replyForm())).rejects.toThrow('redirect /login');
  });
});

describe('closeAction', () => {
  it.each(['../x', 'T-000123/comments', 'T-12', ''])('reference %j never reaches webapi', async (reference) => {
    const { closeAction } = await actions();
    const { emptyClose } = await states();
    const state = await closeAction(emptyClose, form({ reference }));
    expect(calls).toEqual([]);
    expect(state.error).toBeTruthy();
  });

  it('success ⇒ POST …/close with NO body, and the page re-read', async () => {
    routes['POST /support/tickets/T-000123/close'] = { body: fixtures.ticketCloseSuccess };
    const { closeAction } = await actions();
    const { emptyClose } = await states();
    const state = await closeAction(emptyClose, form({ reference: 'T-000123' }));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ url: `${WEBAPI}/support/tickets/T-000123/close`, method: 'POST' });
    expect(calls[0].body).toBeUndefined();
    expect(calls[0].headers['Content-Type']).toBeUndefined();
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toStrictEqual({ error: null });
  });

  it('support-busy ⇒ its sentence', async () => {
    routes['POST /support/tickets/T-000123/close'] = { body: fixtures.supportBusy };
    const { closeAction } = await actions();
    const { emptyClose, SUPPORT_ERRORS } = await states();
    const state = await closeAction(emptyClose, form({ reference: 'T-000123' }));
    expect(state.error).toBe(SUPPORT_ERRORS['support-busy']);
  });

  it('403 ⇒ /login', async () => {
    routes['POST /support/tickets/T-000123/close'] = { body: fixtures.unauthorized };
    const { closeAction } = await actions();
    const { emptyClose } = await states();
    await expect(closeAction(emptyClose, form({ reference: 'T-000123' }))).rejects.toThrow(
      'redirect /login',
    );
  });
});

describe('the reads (webapi.ts)', () => {
  it('list: GET /support/tickets, no query, no-store', async () => {
    routes['GET /support/tickets'] = { body: fixtures.ticketListSuccess };
    const webapi = await import('@/lib/webapi');
    expect(await webapi.listSupportTickets('the-session-token')).toStrictEqual(fixtures.ticketListSuccess);
    expect(calls[0]).toMatchObject({ url: `${WEBAPI}/support/tickets`, method: 'GET', body: undefined });
  });

  it('read: the reference is encodeURIComponent-ed into the path', async () => {
    const webapi = await import('@/lib/webapi');
    await webapi.readSupportTicket('the-session-token', '../x?y=1#z');
    await webapi.replyToSupportTicket('the-session-token', 'a/b', fixtures.ticketCommentRequest);
    await webapi.closeSupportTicket('the-session-token', 'a/b');
    expect(calls.map((call) => call.url)).toEqual([
      `${WEBAPI}/support/tickets/..%2Fx%3Fy%3D1%23z`,
      `${WEBAPI}/support/tickets/a%2Fb/comments`,
      `${WEBAPI}/support/tickets/a%2Fb/close`,
    ]);
  });

  it('read: answers the envelope as given', async () => {
    routes['GET /support/tickets/T-000123'] = { body: fixtures.ticketReadSuccess };
    const webapi = await import('@/lib/webapi');
    expect(await webapi.readSupportTicket('the-session-token', 'T-000123')).toStrictEqual(
      fixtures.ticketReadSuccess,
    );
  });
});
