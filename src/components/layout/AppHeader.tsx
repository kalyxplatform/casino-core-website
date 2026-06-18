"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBrand } from "@/context/BrandContext";
import { fmtCompact, fmtSC } from "@/lib/format/currency";
import { Logo } from "@/components/brand/Logo";

type CoinMode = "gc" | "sc";

export default function AppHeader() {
  const { user, openAuth, openCoins } = useAuth();
  const { brand } = useBrand();
  const [coinMode, setCoinMode] = useState<CoinMode>("gc");
  const [coinDropOpen, setCoinDropOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-[100] w-full h-[60px] shrink-0 grid items-center"
      style={{
        gridTemplateColumns: "minmax(min-content,1fr) minmax(min-content,max-content) minmax(min-content,1fr)",
        background: "var(--casino-surface)",
        borderBottom: "1px solid var(--casino-border)",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,.20), 0 2px 4px -1px rgba(0,0,0,.12)",
        padding: "0 1rem",
        gap: "0.75rem",
      }}
    >
      {/* ── Left: logo (mobile only, sidebar has it on desktop) ── */}
      <div className="flex items-center">
        <Link href="/" className="flex md:hidden items-center gap-2 shrink-0">
          <Logo size={24} letters={brand.logoLetters} />
          <span className="font-bold text-sm tracking-tight" style={{ color: "var(--casino-text)" }}>
            {brand.name}
          </span>
        </Link>
      </div>

      {/* ── Center: coin toggle + wallet (authenticated only) ── */}
      {user ? (
        <div className="flex items-center gap-2 justify-center">
          {/* Coin mode toggle */}
          <div className="relative">
            <button
              onClick={() => setCoinDropOpen((o) => !o)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-all hover:bg-white/5"
              style={{
                background: "var(--casino-surface-2)",
                border: "1px solid var(--casino-border-bright)",
                minWidth: 110,
              }}
            >
              <CoinBadge mode={coinMode} />
              <span style={{ color: coinMode === "gc" ? "var(--casino-gold)" : "var(--casino-sc)" }}>
                {coinMode === "gc" ? fmtCompact(user.gcBalance) : fmtSC(user.scBalance)}
              </span>
              <span
                className={`ml-auto text-xs transition-transform duration-150 ${coinDropOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--casino-text-muted)" }}
              >
                ▾
              </span>
            </button>

            {coinDropOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setCoinDropOpen(false)} />
                <div
                  className="absolute left-0 top-full mt-1.5 rounded-xl shadow-2xl z-40 overflow-hidden py-1"
                  style={{
                    background: "var(--casino-surface-2)",
                    border: "1px solid var(--casino-border-bright)",
                    minWidth: 160,
                  }}
                >
                  {(["gc", "sc"] as CoinMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setCoinMode(m); setCoinDropOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all hover:bg-white/5"
                      style={{ color: coinMode === m ? "var(--casino-text)" : "var(--casino-text-muted)" }}
                    >
                      <CoinBadge mode={m} />
                      <span>{m === "gc" ? "Gold Coins" : "Sweep Coins"}</span>
                      <span className="ml-auto font-semibold" style={{ color: m === "gc" ? "var(--casino-gold)" : "var(--casino-sc)" }}>
                        {m === "gc" ? fmtCompact(user.gcBalance) : fmtSC(user.scBalance)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Wallet / Get Coins */}
          <button
            onClick={openCoins}
            className="h-9 px-4 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: "var(--casino-purple)" }}
          >
            + Wallet
          </button>
        </div>
      ) : null}

      {/* ── Right: icon tray + auth buttons ── */}
      <div className="flex items-center gap-1.5 justify-end">
        {user ? (
          <>
            {/* Search icon */}
            <HeaderIconBtn aria-label="Search">
              <SearchIcon />
            </HeaderIconBtn>

            {/* Notifications */}
            <HeaderIconBtn aria-label="Notifications">
              <BellIcon />
            </HeaderIconBtn>

            {/* User avatar dropdown (simple link to profile for now) */}
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all hover:brightness-110"
              style={{ background: "var(--casino-purple)" }}
            >
              {user.avatarInitials}
            </Link>
          </>
        ) : (
          <>
            <button
              onClick={() => openAuth("login")}
              className="h-9 px-4 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
              style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)" }}
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth("register")}
              className="h-9 px-5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "var(--casino-purple)" }}
            >
              Register
            </button>
          </>
        )}
      </div>
    </header>
  );
}

// ── tiny shared primitives ────────────────────────────────────────────────────

function CoinBadge({ mode }: { mode: CoinMode }) {
  return (
    <span
      className="w-4 h-4 rounded-full flex items-center justify-center font-black shrink-0"
      style={{
        background: mode === "gc" ? "var(--casino-gold)" : "var(--casino-sc)",
        color: mode === "gc" ? "#431407" : "#083344",
        fontSize: 9,
      }}
    >
      {mode === "gc" ? "G" : "S"}
    </span>
  );
}

function HeaderIconBtn({ children, "aria-label": label }: { children: React.ReactNode; "aria-label": string }) {
  return (
    <button
      aria-label={label}
      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/5"
      style={{ color: "var(--casino-text-muted)" }}
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
