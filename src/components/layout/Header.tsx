"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBrand } from "@/context/BrandContext";
import { fmtCompact, fmtSC } from "@/lib/format/currency";
import { Logo } from "@/components/brand/Logo";

const BASE_NAV = [
  { label: "Lobby",      href: "/" },
  { label: "Games",      href: "/games" },
  { label: "Promotions", href: "/promotions" },
  { label: "VIP",        href: "/vip" },
];
const CRYPTO_NAV = { label: "🪙 Crypto", href: "/crypto" };

function CoinPill({ type, value }: { type: "gc" | "sc"; value: string }) {
  const isGc = type === "gc";
  return (
    <div
      className="flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-semibold"
      style={{
        background: "var(--casino-surface-2)",
        border: "1px solid var(--casino-border-bright)",
      }}
    >
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center font-black"
        style={{
          background: isGc ? "var(--casino-gold)" : "var(--casino-sc)",
          color: isGc ? "#431407" : "#083344",
          fontSize: 9,
        }}
      >
        {isGc ? "G" : "S"}
      </span>
      <span style={{ color: isGc ? "var(--casino-gold)" : "var(--casino-sc)" }}>{value}</span>
    </div>
  );
}

function Avatar({ initials, onClick, expanded }: { initials: string; onClick: () => void; expanded: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-haspopup="menu"
      aria-expanded={expanded}
      aria-label="Account menu"
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-transparent hover:ring-purple-500 transition-all"
      style={{ background: "linear-gradient(135deg,var(--casino-purple),#4f46e5)" }}
    >
      {initials}
    </button>
  );
}

export default function Header() {
  const { user, openAuth, logout, openCoins } = useAuth();
  const { brand } = useBrand();
  const pathname = usePathname();
  const router   = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = brand.features.showCrypto ? [...BASE_NAV, CRYPTO_NAV] : BASE_NAV;

  function handleLogout() {
    logout();
    setMenuOpen(false);
    router.push("/");
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className="sticky top-0 z-40 h-16"
      style={{
        background: "rgba(7,7,17,.88)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--casino-border)",
      }}
    >
      <div className="max-w-screen-xl mx-auto h-full px-4 flex items-center gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo size={30} letters={brand.logoLetters} />
          <span className="font-bold text-sm tracking-tight hidden sm:block">{brand.name}</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 ml-2">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="h-8 px-3 flex items-center rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: active ? "var(--casino-text)" : "var(--casino-text-muted)",
                  background: active ? "var(--casino-surface-3)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <>
              {/* Balances */}
              <div className="hidden sm:flex items-center gap-1.5">
                <CoinPill type="gc" value={fmtCompact(user.gcBalance)} />
                <CoinPill type="sc" value={fmtSC(user.scBalance)} />
              </div>

              {/* Buy coins */}
              <button
                onClick={openCoins}
                className="hidden sm:flex h-8 px-4 items-center text-xs font-semibold rounded-full text-white transition-all hover:brightness-110 hover:scale-105"
                style={{ background: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))" }}
              >
                + Get Coins
              </button>

              {/* Avatar + dropdown */}
              <div className="relative">
                <Avatar initials={user.avatarInitials} expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div
                      role="menu"
                      aria-label="Account menu"
                      className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl z-20 overflow-hidden animate-fade-in"
                      style={{
                        background: "var(--casino-surface-2)",
                        border: "1px solid var(--casino-border-bright)",
                      }}
                    >
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--casino-border)" }}>
                        <p className="text-sm font-semibold">{user.username}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>{user.email}</p>
                        <div className="flex gap-1.5 mt-2 sm:hidden">
                          <CoinPill type="gc" value={fmtCompact(user.gcBalance)} />
                          <CoinPill type="sc" value={fmtSC(user.scBalance)} />
                        </div>
                      </div>
                      <div className="p-1.5">
                        <MenuItem href="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</MenuItem>
                        <MenuItem href="/profile" onClick={() => setMenuOpen(false)}>Profile &amp; Settings</MenuItem>
                        <MenuItem href="/transactions" onClick={() => setMenuOpen(false)}>Transactions</MenuItem>
                        <div className="h-px my-1" style={{ background: "var(--casino-border)" }} />
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors hover:bg-white/5"
                          style={{ color: "var(--casino-error)" }}
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuth("login")}
                className="h-9 px-5 rounded-full text-sm font-medium transition-all hover:bg-white/8"
                style={{
                  color: "var(--casino-text)",
                  border: "1px solid var(--casino-border-bright)",
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => openAuth("register")}
                className="h-9 px-5 rounded-full text-sm font-semibold text-white transition-all hover:brightness-110 hover:scale-105"
                style={{ background: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))" }}
              >
                Join Free
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-3 py-2 rounded-xl text-sm transition-colors hover:bg-white/5"
      style={{ color: "var(--casino-text)" }}
    >
      {children}
    </Link>
  );
}
