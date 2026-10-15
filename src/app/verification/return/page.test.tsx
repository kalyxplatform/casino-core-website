import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fixtures from '@/test-fixtures/verification';

// Backend feature 015, T069 — `/verification/return` (also `?closed=1`), where the
// hand-off and the verification provider send the player back. It ONLY re-reads
// the standing; nothing in its address but `closed` is read (contracts §3, SEC-M6).

vi.mock('server-only', () => ({}));
vi.mock('@/lib/session', () => ({
  requireSession: async () => ({
    token: 'the-session-token',
    player: { user_id: 7, country_id: 1, email: 'p@example.com' },
  }),
}));
vi.mock('@/actions/verification', () => ({
  declareAction: async () => ({ error: null, values: {} }),
  dismissAction: async () => ({ error: null, dismissed: false }),
  startVerificationAction: async () => ({ error: null, unavailable: false }),
}));

const fetchSpy = vi.fn();
beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});
afterEach(() => vi.unstubAllGlobals());

const renderPage = async (params: Record<string, string | string[] | undefined>) => {
  const { default: VerificationReturnPage } = await import('./page');
  const tree = await VerificationReturnPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(params),
  } as never);
  return JSON.stringify(tree);
};

const CLOSED = 'That verification session has ended.';

describe('/verification/return', () => {
  it('closed=1 says the session ended, then shows the standing', async () => {
    const page = await renderPage({ closed: '1' });
    expect(page).toContain(CLOSED);
    expect(page).toContain('the-session-token'); // handed to the standing's own read
  });

  it('without closed: no "ended" sentence', async () => {
    expect(await renderPage({})).not.toContain(CLOSED);
  });

  it('reads nothing from the address but `closed`, and asks webapi nothing itself', async () => {
    const page = await renderPage({
      closed: '1',
      reference: fixtures.verificationReference015,
      provider_url: 'https://alchemy.veriff.com/v/token',
      status: 'approved',
    });
    expect(page).not.toContain(fixtures.verificationReference015);
    expect(page).not.toContain('alchemy.veriff.com');
    expect(page).not.toContain('approved');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
