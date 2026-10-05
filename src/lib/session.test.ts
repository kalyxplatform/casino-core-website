import { beforeEach, describe, expect, it, vi } from 'vitest';

// Backend feature 009, T063 (SEC-M11) — the session cookie's flags.
//
// `POST /api/support/turn` is authenticated by this cookie alone, and a Route
// Handler has no built-in origin check. `SameSite=Lax` is what keeps a cross-site
// POST from carrying the session, and `HttpOnly` what keeps a script from reading
// it; the relay's own `Origin` check is the second control, not the only one.

vi.mock('server-only', () => ({}));
const set = vi.fn();
const remove = vi.fn();
vi.mock('next/headers', () => ({
  cookies: async () => ({ set, delete: remove, get: () => undefined }),
}));
vi.mock('next/navigation', () => ({ redirect: () => undefined }));

const SESSION = {
  token: 'the-session-token',
  player: { user_id: 7, email: 'p@example.test', country_id: 1, brand_id: 1, status: 1 },
};

describe('the session cookie', () => {
  beforeEach(() => {
    set.mockReset();
    remove.mockReset();
  });

  it('is written httpOnly and SameSite=Lax, on the whole site', async () => {
    const { writeSession, COOKIE_NAME } = await import('@/lib/session');
    await writeSession(SESSION as never);
    expect(set).toHaveBeenCalledTimes(1);
    const [name, value, options] = set.mock.calls[0];
    expect(name).toBe(COOKIE_NAME);
    expect(JSON.parse(value)).toStrictEqual(SESSION);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(24 * 60 * 60);
  });

  it('is Secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { writeSession } = await import('@/lib/session');
    await writeSession(SESSION as never);
    expect(set.mock.calls[0][2].secure).toBe(true);
    vi.unstubAllEnvs();
  });

  it('is dropped by name', async () => {
    const { clearSession, COOKIE_NAME } = await import('@/lib/session');
    await clearSession();
    expect(remove).toHaveBeenCalledWith(COOKIE_NAME);
  });
});
