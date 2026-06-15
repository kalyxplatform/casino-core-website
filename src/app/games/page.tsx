"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { GAMES, CATEGORIES } from "@/data/games";
import { GameCard } from "@/components/games/GameCard";
import { ProviderStrip } from "@/components/games/ProviderStrip";

const SORTS = ["Popular", "New First", "A → Z", "Z → A"] as const;

// ── page ─────────────────────────────────────────────────────────────────

export default function GamesPage() {
  const { user, openAuth } = useAuth();
  const [activeCat, setActiveCat]       = useState("All");
  const [activeProvider, setProvider]   = useState("All Providers");
  const [sort, setSort]                 = useState("Popular");
  const [search, setSearch]             = useState("");
  const [visible, setVisible]           = useState(12);

  const filtered = useMemo(() => {
    let list = GAMES.filter((g) => {
      if (activeCat !== "All" && g.cat !== activeCat) return false;
      if (activeProvider !== "All Providers" && g.provider !== activeProvider) return false;
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sort === "A → Z") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "Z → A") list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    if (sort === "New First") list = [...list].sort((a, b) => (b.badge === "New" ? 1 : 0) - (a.badge === "New" ? 1 : 0));
    return list;
  }, [activeCat, activeProvider, sort, search]);

  const shown = filtered.slice(0, visible);

  function onPlay() { if (!user) openAuth("register"); }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black mb-1">Game Library</h1>
        <p className="text-sm" style={{ color: "var(--casino-text-muted)" }}>
          {GAMES.length} games across slots, table games, live casino &amp; jackpots
        </p>
      </div>

      {/* Provider selector */}
      <ProviderStrip
        active={activeProvider}
        onSelect={(p) => { setProvider(p); setVisible(12); }}
      />

      {/* Search */}
      <div className="relative mb-6">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">🔍</span>
        <input
          type="text"
          placeholder={activeProvider === "All Providers"
            ? "Search games by name…"
            : `Search ${activeProvider} games…`}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisible(12); }}
          className="w-full h-11 pl-10 pr-4 rounded-2xl text-sm outline-none"
          style={{
            background: "var(--casino-surface-2)",
            border: "1px solid var(--casino-border-bright)",
            color: "var(--casino-text)",
          }}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters */}
        <aside className="lg:w-48 shrink-0 space-y-5">
          {/* Categories */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--casino-text-muted)" }}>
              Category
            </p>
            <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCat(cat); setVisible(12); }}
                  className="shrink-0 h-8 px-3 lg:px-3 lg:w-full lg:text-left rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: activeCat === cat ? "var(--casino-purple)" : "var(--casino-surface-2)",
                    color: activeCat === cat ? "white" : "var(--casino-text-muted)",
                    border: `1px solid ${activeCat === cat ? "var(--casino-purple)" : "var(--casino-border)"}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--casino-text-muted)" }}>
              Sort By
            </p>
            <div className="flex flex-col gap-1">
              {SORTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className="h-8 px-3 rounded-xl text-xs font-medium text-left transition-all"
                  style={{
                    background: sort === s ? "var(--casino-purple-soft)" : "transparent",
                    color: sort === s ? "var(--casino-purple-light)" : "var(--casino-text-muted)",
                    border: `1px solid ${sort === s ? "var(--casino-purple-bright)" : "transparent"}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Game grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs" style={{ color: "var(--casino-text-muted)" }}>
              Showing <strong style={{ color: "var(--casino-text)" }}>{Math.min(visible, filtered.length)}</strong> of{" "}
              <strong style={{ color: "var(--casino-text)" }}>{filtered.length}</strong> games
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: "var(--casino-text-muted)" }}>
              <p className="text-4xl mb-3">🎰</p>
              <p className="text-sm font-medium">No games found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {shown.map((game) => <GameCard key={game.id} game={game} onClick={onPlay} showProvider />)}
              </div>

              {visible < filtered.length && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setVisible((v) => v + 12)}
                    className="h-10 px-8 rounded-full text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background: "var(--casino-surface-2)",
                      border: "1px solid var(--casino-border-bright)",
                      color: "var(--casino-text)",
                    }}
                  >
                    Load More Games ({filtered.length - visible} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

