"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { GAMES } from "@/data/games";
import { GameCard } from "@/components/games/GameCard";
import { ProviderPills } from "@/components/games/ProviderPills";
import { CardFooter } from "@/components/games/CardFooter";
import Link from "next/link";

// ── promotions ────────────────────────────────────────────────────────────────

const PROMOS = [
  {
    id:       "races",
    badge:    "Daily",
    title:    "Daily Races",
    sub:      "Win a share of $100,000 every day",
    href:     "/promotions/race",
    gradient: "linear-gradient(135deg, #1a0545 0%, #2d1b69 55%, #0d1b22 100%)",
    accent:   "#7c3aed",
    emoji:    "🏆",
  },
  {
    id:       "welcome",
    badge:    "Welcome",
    title:    "250K Free Coins",
    sub:      "Register today, play instantly — no purchase needed",
    href:     "/register",
    gradient: "linear-gradient(135deg, #0a1e3d 0%, #1a3a6b 55%, #0d1b22 100%)",
    accent:   "#1475e1",
    emoji:    "🎁",
  },
  {
    id:       "raffle",
    badge:    "Weekly",
    title:    "$75K Raffle",
    sub:      "Every wager earns you a ticket. Draw every Sunday.",
    href:     "/promotions/raffle",
    gradient: "linear-gradient(135deg, #1c0a03 0%, #7c2d12 55%, #0d1b22 100%)",
    accent:   "#f59e0b",
    emoji:    "🎟️",
  },
  {
    id:       "vip",
    badge:    "VIP",
    title:    "VIP Rewards",
    sub:      "Level up for exclusive perks, cashback & higher limits",
    href:     "/vip",
    gradient: "linear-gradient(135deg, #0a1c0a 0%, #14532d 55%, #0d1b22 100%)",
    accent:   "#03e625",
    emoji:    "👑",
  },
  {
    id:       "wheelwars",
    badge:    "Event",
    title:    "Wheel Wars",
    sub:      "Compete on the wheel leaderboard. Top 3 take the pot.",
    href:     "/promotions/wheel-wars",
    gradient: "linear-gradient(135deg, #1a0a2e 0%, #4c1d95 55%, #0d1b22 100%)",
    accent:   "#a855f7",
    emoji:    "🎡",
  },
] as const;

// ── sports events ─────────────────────────────────────────────────────────────

const SPORTS_PICKS = [
  { id: "s1", flag: "🇧🇷", team1: "Brazil",      team2: "Argentina", score1: 2, score2: 1, sport: "⚽", joined: "12.4K", live: true  },
  { id: "s2", flag: "🇪🇸", team1: "Spain",       team2: "France",    score1: 0, score2: 0, sport: "⚽", joined: "8.1K",  live: true  },
  { id: "s3", flag: "🇩🇪", team1: "Germany",     team2: "England",   score1: 3, score2: 2, sport: "⚽", joined: "6.7K",  live: false },
  { id: "s4", flag: "🇮🇹", team1: "Italy",       team2: "Portugal",  score1: 1, score2: 1, sport: "⚽", joined: "5.2K",  live: true  },
  { id: "s5", flag: "🇺🇸", team1: "USA",         team2: "Mexico",    score1: 2, score2: 0, sport: "⚽", joined: "3.8K",  live: false },
  { id: "s6", flag: "🇳🇱", team1: "Netherlands", team2: "Croatia",   score1: 0, score2: 1, sport: "⚽", joined: "2.9K",  live: true  },
];

// ── game rows ─────────────────────────────────────────────────────────────────

const ROWS = [
  { id: "slots",     icon: "🎲", title: "Slots",             href: "/games?cat=Slots",       games: GAMES.filter((g) => g.cat === "Slots")            },
  { id: "live",      icon: "📺", title: "Live Games",        href: "/games?cat=Live+Casino", games: GAMES.filter((g) => g.cat === "Live Casino")       },
  { id: "originals", icon: "⭐", title: "Only on Our Casino", href: "/games?cat=Originals",   games: GAMES.filter((g) => g.cat === "Originals")         },
  { id: "burst",     icon: "💥", title: "Burst Games",       href: "/games?cat=Burst",       games: GAMES.filter((g) => g.cat === "Burst")             },
  { id: "worldcup",  icon: "🏆", title: "World Cup",         href: "/games?cat=Slots",       games: GAMES.filter((g) => g.cat === "Slots").slice(0, 8) },
  { id: "new",       icon: "✨", title: "New Releases",      href: "/games?cat=new",         games: GAMES.filter((g) => g.badge === "New")             },
] as const;

// ── sub-components ────────────────────────────────────────────────────────────

function PromotionCard({ promo, onClick }: { promo: typeof PROMOS[number]; onClick?: () => void }) {
  const isRegister = promo.href === "/register";
  const inner = (
    <div
      className="relative shrink-0 rounded-2xl overflow-hidden"
      style={{ background: promo.gradient, border: `1px solid ${promo.accent}33`, width: 300, height: 170 }}
    >
      <div
        className="absolute top-0 left-0 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${promo.accent}33, transparent 70%)` }}
      />
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "1fr auto" }}>
        <div className="flex flex-col justify-between p-4 pr-2 min-w-0">
          <div>
            <span
              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2"
              style={{ background: `${promo.accent}22`, color: promo.accent, border: `1px solid ${promo.accent}44` }}
            >
              {promo.badge}
            </span>
            <h3 className="text-white font-black text-base leading-snug line-clamp-1">{promo.title}</h3>
            <p className="text-white/60 text-[11px] mt-1 line-clamp-2 leading-snug">{promo.sub}</p>
          </div>
          <span className="text-[11px] font-semibold mt-2 flex items-center gap-1" style={{ color: promo.accent }}>
            Read more →
          </span>
        </div>
        <div
          className="w-24 flex items-center justify-center text-6xl"
          style={{ background: `radial-gradient(ellipse at 60% 40%, ${promo.accent}44 0%, transparent 70%)` }}
        >
          {promo.emoji}
        </div>
      </div>
    </div>
  );
  if (isRegister && onClick) {
    return <div onClick={onClick} className="shrink-0 cursor-pointer transition-opacity hover:opacity-90">{inner}</div>;
  }
  return <Link href={promo.href} className="shrink-0 transition-opacity hover:opacity-90">{inner}</Link>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, href }: { icon: string; title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <Link
        href={href}
        className="flex items-center gap-2 font-bold text-sm hover:opacity-80 transition-opacity"
        style={{ color: "var(--casino-text)" }}
      >
        <span>{icon}</span>{title}
      </Link>
      <Link href={href} className="text-xs font-semibold hover:underline" style={{ color: "var(--casino-text-muted)" }}>
        View All
      </Link>
    </div>
  );
}

function GameRow({
  icon, title, href, games, onCardClick,
}: {
  icon:         string;
  title:        string;
  href:         string;
  games:        typeof GAMES;
  onCardClick?: () => void;
}) {
  if (games.length === 0) return null;
  return (
    <section>
      <SectionHeader icon={icon} title={title} href={href} />
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(max(120px, calc((100% - 60px) / 7)), 1fr))" }}>
        {games.slice(0, 16).map((game) =>
          onCardClick ? (
            <GameCard key={game.id} game={game} onClick={onCardClick} footer={<CardFooter id={game.id} />} />
          ) : (
            <Link key={game.id} href={`/games/${game.id}`}>
              <GameCard game={game} footer={<CardFooter id={game.id} />} />
            </Link>
          )
        )}
      </div>
    </section>
  );
}

function SportsPicks({ onPickClick }: { onPickClick?: () => void }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 font-bold text-sm" style={{ color: "var(--casino-text)" }}>
          <span>🏅</span>Top Sports Picks
        </span>
        <Link href="/sports" className="text-xs font-semibold hover:underline" style={{ color: "var(--casino-text-muted)" }}>
          View All
        </Link>
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {SPORTS_PICKS.map((event) => (
          <div
            key={event.id}
            onClick={onPickClick}
            className="rounded-xl p-3 cursor-pointer transition-all hover:bg-white/5"
            style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border-bright)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-base">{event.sport}</span>
              {event.live
                ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "#dc2626", color: "white" }}>LIVE</span>
                : <span className="text-[9px] font-medium" style={{ color: "var(--casino-text-muted)" }}>Today</span>}
            </div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex flex-col items-center gap-0.5 flex-1">
                <span className="text-2xl">{event.flag}</span>
                <span className="text-[10px] font-semibold truncate w-full text-center" style={{ color: "var(--casino-text)" }}>{event.team1}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--casino-surface-3)", color: "var(--casino-text)" }}>{event.score1}</span>
                <span className="text-xs font-bold" style={{ color: "var(--casino-text-muted)" }}>:</span>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--casino-surface-3)", color: "var(--casino-text)" }}>{event.score2}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 flex-1">
                <span className="text-2xl">🏳️</span>
                <span className="text-[10px] font-semibold truncate w-full text-center" style={{ color: "var(--casino-text)" }}>{event.team2}</span>
              </div>
            </div>
            <div className="flex items-center gap-1" style={{ color: "var(--casino-text-muted)" }}>
              <span className="text-[9px]">👥</span>
              <span className="text-[9px]">{event.joined} joined</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function providerHref(name: string) {
  return name === "All Providers" ? "/games" : `/games?provider=${encodeURIComponent(name)}`;
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function CasinoPage() {
  const { user, openAuth } = useAuth();
  const isGuest = !user;
  const [search, setSearch] = useState("");

  function onCardClick() { if (isGuest) openAuth("register"); }

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return null;
    return GAMES.filter((g) =>
      g.name.toLowerCase().includes(q) || g.provider.toLowerCase().includes(q)
    );
  }, [search]);

  const isFiltering = searchResults !== null;

  return (
    <div className="flex flex-col gap-6 py-4">

      {/* ── Promotions ── */}
      {!isFiltering && (
        <section className="flex gap-3 overflow-x-auto hide-scrollbar">
          {PROMOS.map((promo) => (
            <PromotionCard
              key={promo.id}
              promo={promo}
              onClick={promo.href === "/register" && isGuest ? onCardClick : undefined}
            />
          ))}
          <div className="shrink-0 w-1" aria-hidden />
        </section>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search games or providers…"
          className="w-full h-12 pl-11 pr-10 rounded-2xl text-sm outline-none"
          style={{
            background: "var(--casino-surface-2)",
            border: "1px solid var(--casino-border-bright)",
            color: "var(--casino-text)",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all hover:bg-white/10"
            style={{ color: "var(--casino-text-muted)" }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>


      {/* ── Filter results ── */}
      {isFiltering && (
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold" style={{ color: "var(--casino-text)" }}>
              {searchResults!.length === 0 ? "No games found" : (
                <>
                  <span style={{ color: "var(--casino-text-muted)" }}>Showing </span>
                  <strong>{searchResults!.length}</strong>
                  <span style={{ color: "var(--casino-text-muted)" }}> game{searchResults!.length !== 1 ? "s" : ""}</span>
                </>
              )}
            </p>
            <button
              onClick={() => setSearch("")}
              className="text-xs font-semibold hover:underline"
              style={{ color: "var(--casino-text-muted)" }}
            >
              Clear
            </button>
          </div>
          {searchResults!.length === 0 ? (
            <div className="text-center py-12" style={{ color: "var(--casino-text-muted)" }}>
              <p className="text-4xl mb-3">🎰</p>
              <p className="text-sm font-medium">No games match your search</p>
              <p className="text-xs mt-1">Try a different name or provider</p>
            </div>
          ) : (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(max(120px, calc((100% - 60px) / 7)), 1fr))" }}>
              {searchResults!.map((game) => (
                <GameCard key={game.id} game={game} onClick={onCardClick} footer={<CardFooter id={game.id} />} />
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Normal lobby sections ── */}
      {!isFiltering && (
        <>
          <SectionCard><GameRow {...ROWS[0]} onCardClick={isGuest ? onCardClick : undefined} /></SectionCard>

          {/* Providers */}
          <SectionCard>
            <SectionHeader icon="🏢" title="Providers" href="/games" />
            <ProviderPills active="All Providers" getHref={providerHref} />
          </SectionCard>

          <SectionCard><GameRow {...ROWS[1]} onCardClick={isGuest ? onCardClick : undefined} /></SectionCard>
          <SectionCard><GameRow {...ROWS[2]} onCardClick={isGuest ? onCardClick : undefined} /></SectionCard>
          <SectionCard><GameRow {...ROWS[3]} onCardClick={isGuest ? onCardClick : undefined} /></SectionCard>
          <SectionCard><GameRow {...ROWS[4]} onCardClick={isGuest ? onCardClick : undefined} /></SectionCard>
          <SectionCard><SportsPicks onPickClick={isGuest ? onCardClick : undefined} /></SectionCard>
          <SectionCard><GameRow {...ROWS[5]} onCardClick={isGuest ? onCardClick : undefined} /></SectionCard>
        </>
      )}

    </div>
  );
}
