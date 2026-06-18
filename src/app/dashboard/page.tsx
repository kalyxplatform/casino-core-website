"use client";

import { useState } from "react";
import { useAuth, User } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { fmtCompact, fmtSC } from "@/lib/format/currency";
import { GAMES } from "@/data/games";
import { tierForLevel } from "@/data/vip-tiers";
import { GameCard } from "@/components/games/GameCard";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── protected route guard ─────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, ready } = useProtectedRoute();
  const { logout, openCoins } = useAuth();
  const router = useRouter();

  if (!ready || !user) return <DashboardSkeleton />;
  return <DashboardContent user={user} onLogout={() => { logout(); router.push("/"); }} onGetCoins={openCoins} />;
}

// ── main content ──────────────────────────────────────────────────────────

const SIDEBAR_LINKS = [
  { icon: "🏠", label: "Overview",     href: "/dashboard",      active: true },
  { icon: "🎰", label: "My Games",     href: "/dashboard/games" },
  { icon: "🎁", label: "Bonuses",      href: "/dashboard/bonuses" },
  { icon: "👑", label: "VIP Status",   href: "/dashboard/vip" },
  { icon: "💳", label: "Transactions", href: "/dashboard/transactions" },
  { icon: "⚙️", label: "Settings",    href: "/dashboard/settings" },
];

/** Recent-play fixture: refs into the shared catalog + a lastWin label. */
const RECENT_GAMES: { gameId: number; lastWin: string }[] = [
  { gameId: 1,  lastWin: "2,400 GC" },  // Starburst Wilds
  { gameId: 4,  lastWin: "0 GC"     },  // Neon City 3000
  { gameId: 17, lastWin: "5,100 GC" },  // Blackjack Pro
  { gameId: 2,  lastWin: "1,200 GC" },  // Dragon's Fortune
];

const QUICK_STATS = [
  { label: "Games Played", value: "248",   icon: "🎮" },
  { label: "Biggest Win",  value: "42K GC",icon: "🏆" },
  { label: "Daily Streak", value: "7 days",icon: "🔥" },
  { label: "Friends",      value: "12",    icon: "👥" },
];

function DashboardContent({ user, onLogout, onGetCoins }: { user: User; onLogout: () => void; onGetCoins: () => void }) {
  const xpPct = Math.round((user.xp / user.xpToNext) * 100);

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* ── Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col w-60 shrink-0 py-6 px-3"
        style={{
          background: "var(--casino-surface)",
          borderRight: "1px solid var(--casino-border)",
        }}
      >
        {/* Avatar block */}
        <div className="flex flex-col items-center gap-2 px-3 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg animate-pulse-glow"
            style={{ background: "var(--casino-purple)" }}
          >
            {user.avatarInitials}
          </div>
          <p className="font-bold text-sm">{user.username}</p>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "var(--casino-purple-soft)", color: "var(--casino-purple-light)" }}
          >
            Level {user.level}
          </span>
          {/* XP bar */}
          <div className="w-full mt-1">
            <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--casino-text-muted)" }}>
              <span>XP {fmtCompact(user.xp)}</span>
              <span>{fmtCompact(user.xpToNext)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--casino-surface-3)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${xpPct}%`,
                  background: "var(--casino-purple)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5">
          {SIDEBAR_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-all hover:bg-white/6"
              style={{
                background: item.active ? "var(--casino-surface-3)" : "transparent",
                color: item.active ? "var(--casino-text)" : "var(--casino-text-muted)",
                border: item.active ? "1px solid var(--casino-border-bright)" : "1px solid transparent",
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4" style={{ borderTop: "1px solid var(--casino-border)" }}>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full h-10 px-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/6"
            style={{ color: "var(--casino-error)" }}
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Welcome + balances */}
          <div
            className="relative overflow-hidden rounded-2xl p-6"
            style={{
              background: "var(--casino-surface-2)",
              border: "1px solid var(--casino-border-bright)",
            }}
          >
            <div className="absolute right-4 top-4 text-6xl opacity-10 pointer-events-none select-none">🎰</div>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--casino-text-muted)" }}>
              Welcome back,
            </p>
            <h1 className="text-2xl font-black mb-4">{user.username} 👋</h1>

            <div className="flex flex-wrap gap-3">
              <BalanceCard type="gc" amount={user.gcBalance} />
              <BalanceCard type="sc" amount={user.scBalance} isSC />
              <button
                onClick={onGetCoins}
                className="h-14 px-6 rounded-2xl text-sm font-bold text-white flex items-center gap-2 transition-all hover:brightness-110 hover:scale-[1.02] self-stretch"
                style={{ background: "var(--casino-purple)" }}
              >
                🪙 Get More Coins
              </button>
            </div>
          </div>

          {/* Daily bonus */}
          <DailyBonus />

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-4 flex flex-col gap-1"
                style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
              >
                <span className="text-2xl">{s.icon}</span>
                <p className="text-lg font-black mt-1">{s.value}</p>
                <p className="text-xs" style={{ color: "var(--casino-text-muted)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent games */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">Recently Played</h2>
              <Link href="/" className="text-xs font-medium hover:underline" style={{ color: "var(--casino-purple-light)" }}>
                Browse All →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {RECENT_GAMES.map(({ gameId, lastWin }) => {
                const game = GAMES.find((g) => g.id === gameId);
                if (!game) return null;
                return (
                  <GameCard
                    key={gameId}
                    game={game}
                    overlayLabel="Play Again"
                    hideBadge
                    footer={lastWin !== "0 GC" && (
                      <p className="text-[10px] mt-1 font-semibold" style={{ color: "var(--casino-gold)" }}>
                        Last win: {lastWin}
                      </p>
                    )}
                  />
                );
              })}
            </div>
          </section>

          {/* VIP progress */}
          <VIPProgress level={user.level} xp={user.xp} xpToNext={user.xpToNext} />

        </div>
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────

function BalanceCard({ type, amount, isSC }: { type: string; amount: number; isSC?: boolean }) {
  const label = isSC ? "Sweep Coins" : "Gold Coins";
  const color = isSC ? "var(--casino-sc)" : "var(--casino-gold)";
  const letter = isSC ? "S" : "G";

  return (
    <div
      className="flex items-center gap-3 px-4 rounded-2xl h-14 min-w-[150px]"
      style={{ background: "rgba(255,255,255,.06)", border: "1px solid var(--casino-border-bright)" }}
    >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0"
        style={{ background: color, color: isSC ? "#083344" : "#431407" }}
      >
        {letter}
      </span>
      <div>
        <p className="text-xs" style={{ color: "var(--casino-text-muted)" }}>{label}</p>
        <p className="text-sm font-black" style={{ color }}>
          {isSC ? fmtSC(amount) : fmtCompact(amount)}
        </p>
      </div>
    </div>
  );
}

function DailyBonus() {
  const [collected, setCollected] = useState(false);

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{
        background: collected
          ? "var(--casino-surface-2)"
          : "var(--casino-gold-soft)",
        border: `1px solid ${collected ? "var(--casino-border)" : "var(--casino-gold-bright)"}`,
      }}
    >
      <span className="text-3xl">{collected ? "✅" : "🎁"}</span>
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color: collected ? "var(--casino-text-muted)" : "var(--casino-gold)" }}>
          {collected ? "Bonus Collected!" : "Daily Bonus Available"}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>
          {collected ? "Come back tomorrow for more free coins." : "Claim 5,000 Gold Coins + 0.10 Sweep Coin — resets in 23h"}
        </p>
      </div>
      {!collected && (
        <button
          onClick={() => setCollected(true)}
          className="shrink-0 h-9 px-5 rounded-full text-xs font-bold text-white transition-all hover:scale-105 hover:brightness-110"
          style={{ background: "var(--casino-gold)" }}
        >
          Collect
        </button>
      )}
    </div>
  );
}

function VIPProgress({ level, xp, xpToNext }: { level: number; xp: number; xpToNext: number }) {
  const pct  = Math.round((xp / xpToNext) * 100);
  const tier = tierForLevel(level);

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold">VIP Progress</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>
            Level {level} · {tier.name} Tier
          </p>
        </div>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: `${tier.color}22`, color: tier.color, border: `1px solid ${tier.color}55` }}
        >
          {tier.name}
        </span>
      </div>

      <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--casino-surface-3)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: tier.color }}
        />
      </div>
      <div className="flex justify-between text-xs" style={{ color: "var(--casino-text-muted)" }}>
        <span>{xp.toLocaleString()} XP</span>
        <span>{xpToNext.toLocaleString()} XP to Level {level + 1}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {["Cashback Boost", "Priority Support", "Exclusive Games"].map((perk) => (
          <div
            key={perk}
            className="text-center text-[10px] font-medium py-2 rounded-xl"
            style={{ background: "var(--casino-surface)", color: "var(--casino-text-muted)", border: "1px solid var(--casino-border)" }}
          >
            {perk}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── skeleton ──────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      {[200, 100, 150].map((h, i) => (
        <div
          key={i}
          className="rounded-2xl animate-pulse"
          style={{ height: h, background: "var(--casino-surface-2)" }}
        />
      ))}
    </div>
  );
}
