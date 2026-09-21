import Link from 'next/link';
import { logoutAction } from '@/actions/auth';
import type { PlayerProfile } from '@/lib/webapi';

type Tab = 'account' | 'games' | 'store';

/** The chrome every signed-in page sits in: who you are, where you can go, and out. */
export function AppShell({
  player,
  current,
  children,
}: {
  player: PlayerProfile;
  current: Tab;
  children: React.ReactNode;
}) {
  const tab = (href: string, key: Tab, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        current === key ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-edge bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">casino-core</span>

          <nav className="flex items-center gap-1">
            {tab('/account', 'account', 'Profile')}
            {tab('/games', 'games', 'Games')}
            {tab('/store', 'store', 'Get coins')}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">{player.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-edge px-3 py-1.5 text-sm text-ink-muted transition hover:border-ink-muted hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
