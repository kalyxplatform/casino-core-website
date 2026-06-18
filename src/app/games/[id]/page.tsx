"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { GAMES } from "@/data/games";
import Link from "next/link";

export default function GameLaunchPage() {
  const { id }  = useParams();
  const router  = useRouter();
  const { user, openAuth } = useAuth();
  const [muted,    setMuted]    = useState(false);
  const [launched, setLaunched] = useState(false);
  const [reloading, setReloading] = useState(false);

  function handleReload() {
    setReloading(true);
    setLaunched(false);
    setTimeout(() => setReloading(false), 600);
  }

  const game = GAMES.find((g) => g.id === Number(id));

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-4xl">🎰</p>
        <p className="text-sm font-medium" style={{ color: "var(--casino-text-muted)" }}>Game not found</p>
        <Link href="/games" className="text-xs font-semibold hover:underline" style={{ color: "var(--casino-purple-light, #a78bfa)" }}>
          ← Back to Games
        </Link>
      </div>
    );
  }

  const badgeColor =
    game.badge === "Live" ? "#dc2626" :
    game.badge === "New"  ? "var(--casino-purple)" :
    game.badge === "Hot"  ? "#b45309" :
    "rgba(0,0,0,.55)";

  return (
    <div className="flex flex-col gap-0 -mx-[3vw]">

      {/* ── Game toolbar ── */}
      <div
        className="flex items-center gap-3 h-12 px-4 shrink-0"
        style={{
          background: "var(--casino-surface-2)",
          borderBottom: "1px solid var(--casino-border)",
        }}
      >
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold h-8 px-3 rounded-xl transition-all hover:bg-white/5 shrink-0"
          style={{ color: "var(--casino-text-muted)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div className="h-4 w-px shrink-0" style={{ background: "var(--casino-border)" }} />

        {/* Game identity */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl leading-none shrink-0">{game.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--casino-text)" }}>{game.name}</p>
            <p className="text-[10px] truncate" style={{ color: "var(--casino-text-muted)" }}>{game.provider}</p>
          </div>
          {game.badge && (
            <span
              className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: badgeColor, color: "white" }}
            >
              {game.badge}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMuted((o) => !o)}
            title={muted ? "Unmute" : "Mute"}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all hover:bg-white/5"
            style={{ color: "var(--casino-text-muted)" }}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <Link
            href={`/games/${game.id}?fs=1`}
            title="Fullscreen"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/5"
            style={{ color: "var(--casino-text-muted)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </Link>

          {/* Reload — dark pill to differentiate */}
          <button
            onClick={handleReload}
            title="Reload game"
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold transition-all hover:brightness-110 ml-1"
            style={{ background: "var(--casino-bg)", color: "var(--casino-text-muted)", border: "1px solid var(--casino-border)" }}
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
              strokeLinecap="round" strokeLinejoin="round"
              className={`w-3.5 h-3.5 transition-transform duration-500 ${reloading ? "rotate-180" : ""}`}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Reload
          </button>
        </div>
      </div>

      {/* ── Game window ── */}
      <div
        className="relative w-full flex items-center justify-center"
        style={{
          minHeight: "calc(100vh - 60px - 48px)",
          background: game.bg,
        }}
      >
        {/* Radial vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)" }}
        />

        {!launched ? (
          /* Pre-launch splash */
          <div className="relative flex flex-col items-center gap-6 text-center px-8">
            {/* Giant emoji */}
            <div
              className="w-32 h-32 rounded-3xl flex items-center justify-center text-7xl shadow-2xl"
              style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {game.emoji}
            </div>

            <div>
              <h1 className="text-3xl font-black text-white mb-1">{game.name}</h1>
              <p className="text-white/60 text-sm">by {game.provider}</p>
            </div>

            {/* Demo mode badge */}
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              🎮 Demo Mode — Play for Free
            </span>

            {/* Launch button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setLaunched(true)}
                className="h-12 px-8 rounded-2xl text-sm font-bold text-white transition-all hover:brightness-110 hover:scale-[1.03] flex items-center gap-2"
                style={{ background: "var(--casino-purple)", boxShadow: "0 0 24px var(--casino-purple)66" }}
              >
                ▶ Play Demo
              </button>
              {!user && (
                <button
                  onClick={() => openAuth("register")}
                  className="h-12 px-8 rounded-2xl text-sm font-semibold transition-all hover:bg-white/15 flex items-center gap-2"
                  style={{ background: "rgba(255,255,255,0.10)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  Play for Real →
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Post-launch — simulated game viewport */
          <div className="relative w-full h-full flex flex-col items-center justify-center gap-6" style={{ minHeight: "calc(100vh - 60px - 48px)" }}>
            {/* Simulated game UI */}
            <div
              className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              {/* Fake game screen */}
              <div className="flex items-center justify-center py-20 text-8xl">{game.emoji}</div>

              {/* Fake controls bar */}
              <div
                className="flex items-center justify-between gap-4 px-6 py-4"
                style={{ background: "rgba(0,0,0,0.4)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Balance</span>
                  <span className="text-sm font-black text-white">250,000 GC</span>
                </div>
                <button
                  className="h-12 w-32 rounded-2xl text-sm font-black text-white transition-all hover:brightness-110"
                  style={{ background: "var(--casino-purple)", boxShadow: "0 0 20px var(--casino-purple)55" }}
                >
                  SPIN
                </button>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Bet</span>
                  <span className="text-sm font-black text-white">1.00 GC</span>
                </div>
              </div>
            </div>

            {!user && (
              <button
                onClick={() => openAuth("register")}
                className="h-10 px-6 rounded-full text-xs font-bold text-white transition-all hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Play for Real Money →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
