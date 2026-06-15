"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBrand } from "@/context/BrandContext";
import { POPULAR_GAMES, CATEGORIES } from "@/data/games";
import { GameCard } from "@/components/games/GameCard";
import Link from "next/link";

const PROMOS = [
  {
    title: "Daily Bonus",
    desc: "Collect your free coins every 24 hours",
    cta: "Collect Now",
    bg: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",
    emoji: "🎁",
  },
  {
    title: "Refer a Friend",
    desc: "Earn 10,000 GC for every friend you invite",
    cta: "Invite Friends",
    bg: "linear-gradient(135deg,#059669 0%,#0891b2 100%)",
    emoji: "👥",
  },
  {
    title: "VIP Rewards",
    desc: "Exclusive perks, higher limits, personal host",
    cta: "Learn More",
    bg: "linear-gradient(135deg,#b45309 0%,#f59e0b 100%)",
    emoji: "👑",
  },
];

// ── page ──────────────────────────────────────────────────────────────────

export default function LobbyPage() {
  const { user, openAuth } = useAuth();
  const { brand } = useBrand();
  const [activeCat, setActiveCat] = useState<typeof CATEGORIES[number]>("All");
  const visibleGames = useMemo(
    () => activeCat === "All" ? POPULAR_GAMES : POPULAR_GAMES.filter((g) => g.cat === activeCat),
    [activeCat],
  );

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: "var(--casino-surface)" }}>
        {/* Decorative radial glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle,var(--casino-purple),transparent 70%)" }} />
          <div className="absolute bottom-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle,var(--casino-gold),transparent 70%)" }} />
        </div>

        <div className="relative max-w-screen-xl mx-auto px-4 py-20 md:py-28 text-center">
          {/* Tag */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: "var(--casino-purple-soft)", border: "1px solid var(--casino-purple-bright)", color: "var(--casino-purple-light)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            250,000+ players online
          </span>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.08] mb-5">
            {brand.heroHeadline.split("\n").map((line, i, arr) => (
              <span key={i}>
                {i === arr.length - 1 ? (
                  <span style={{
                    backgroundImage: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                    {line}
                  </span>
                ) : (
                  <>{line}{"\n"}</>
                )}
              </span>
            ))}
          </h1>

          <p className="text-lg md:text-xl max-w-xl mx-auto mb-8" style={{ color: "var(--casino-text-muted)" }}>
            {brand.heroSub}
          </p>

          {/* Bonus callout */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-8 text-sm font-semibold"
            style={{
              background: "var(--casino-gold-soft)",
              border: "1px solid var(--casino-gold-bright)",
            }}
          >
            <span>🎁</span>
            <span style={{ color: "var(--casino-gold)" }}>50,000 Gold Coins + 1.00 Sweep Coin</span>
            <span style={{ color: "var(--casino-text-muted)" }}>FREE on signup</span>
          </div>

          {/* CTAs */}
          {user ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="h-12 px-8 rounded-full text-sm font-semibold text-white flex items-center justify-center transition-all hover:brightness-110 hover:scale-105"
                style={{ background: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))" }}
              >
                Go to Dashboard →
              </Link>
              <button className="h-12 px-8 rounded-full text-sm font-medium transition-all hover:bg-white/10"
                style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)" }}>
                Browse Games
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => openAuth("register")}
                className="h-12 px-8 rounded-full text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:scale-105"
                style={{ background: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))" }}
              >
                🎰 Play for Free
              </button>
              <button
                onClick={() => openAuth("login")}
                className="h-12 px-8 rounded-full text-sm font-medium transition-all hover:bg-white/8"
                style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)" }}
              >
                Sign In
              </button>
            </div>
          )}

          {/* Trust strip */}
          <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
            {["🔒 Secure & Licensed", "🆓 Always Free to Play", "🏆 Real Prize Redemptions", "⚡ Instant Payouts"].map((t) => (
              <span key={t} className="text-xs font-medium" style={{ color: "var(--casino-text-muted)" }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Promos strip ── */}
      <section className="max-w-screen-xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PROMOS.map((p) => (
            <div
              key={p.title}
              className="relative overflow-hidden rounded-2xl p-5 flex items-center gap-4 group cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl"
              style={{ background: p.bg }}
            >
              <span className="text-4xl shrink-0">{p.emoji}</span>
              <div>
                <p className="font-bold text-white text-sm">{p.title}</p>
                <p className="text-xs text-white/70 mt-0.5 mb-3">{p.desc}</p>
                <span className="text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full transition-colors">
                  {p.cta}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Game Grid ── */}
      <section className="max-w-screen-xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Popular Games</h2>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => {
              const isActive = activeCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className="shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: isActive ? "var(--casino-purple)" : "var(--casino-surface-2)",
                    color: isActive ? "white" : "var(--casino-text-muted)",
                    border: "1px solid var(--casino-border)",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {visibleGames.map((game) => (
            <GameCard key={game.id} game={game} onClick={() => !user && openAuth("register")} />
          ))}
          {visibleGames.length === 0 && (
            <p className="col-span-full text-center py-12 text-sm" style={{ color: "var(--casino-text-muted)" }}>
              No games in this category yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
