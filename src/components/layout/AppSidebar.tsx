"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/context/AuthContext";
import { useBrand } from "@/context/BrandContext";
import { fmtCompact, fmtSC } from "@/lib/format/currency";

// ── data ─────────────────────────────────────────────────────────────────────

const MAIN_NAV = [
  { icon: "🏠", label: "Casino",  href: "/" },
];
const CRYPTO_NAV = { icon: "🪙", label: "Crypto", href: "/crypto" };

const AUTH_GATED_NAV = [
  { icon: "🔖", label: "Saved Games",      href: "/casino/favourites" },
  { icon: "❤️",  label: "Following",        href: "/casino/following" },
  { icon: "▶️",  label: "Continue Playing", href: "/casino/recent" },
  { icon: "⭐",  label: "Games For You",    href: "/casino/recommended" },
  { icon: "🎟️", label: "My Bets",           href: "/my-bets" },
];

const GAME_CATS = [
  { icon: "🎰",  label: "See All",      href: "/games" },
  { icon: "🔥",  label: "Top Picks",    href: "/games?cat=top" },
  { icon: "✨",  label: "New Releases", href: "/games?cat=new" },
  { icon: "🎰",  label: "Slots",        href: "/games?cat=Slots" },
  { icon: "🎮",  label: "Originals",    href: "/games?cat=originals" },
  { icon: "📺",  label: "Live Casino",  href: "/games?cat=Live+Casino" },
  { icon: "🎬",  label: "Game Shows",   href: "/games?cat=Game+Shows" },
  { icon: "💥",  label: "Burst Games",  href: "/games?cat=Burst" },
  { icon: "📈",  label: "Enhanced RTP", href: "/games?cat=Enhanced+RTP" },
  { icon: "♠️",  label: "Poker",        href: "/games?cat=Poker" },
  { icon: "💎",  label: "Bonus Buy",    href: "/games?cat=Bonus+Buy" },
  { icon: "🃏",  label: "Blackjack",    href: "/games?cat=Blackjack" },
  { icon: "🎴",  label: "Baccarat",     href: "/games?cat=Baccarat" },
  { icon: "🎡",  label: "Roulette",     href: "/games?cat=Roulette" },
  { icon: "🏢",  label: "Publishers",   href: "/games/publishers" },
];

const PROMO_SUB = [
  { label: "$75k Weekly Raffle", href: "/promotions/raffle" },
  { label: "$100k Race",         href: "/promotions/race" },
  { label: "Wheel Wars",         href: "/promotions/wheel-wars" },
  { label: "View All",           href: "/promotions" },
];

const OTHER_NAV = [
  { icon: "🏆", label: "Challenges", href: "/challenges" },
  { icon: "🤝", label: "Affiliate",  href: "/affiliate" },
  { icon: "👑", label: "VIP Club",   href: "/vip" },
  { icon: "📝", label: "Blog",       href: "/blog" },
  { icon: "💬", label: "Forum",      href: "/forum" },
];

const SPONSORSHIP_SUB = [
  { label: "Sports",        href: "/sponsorships/sports" },
  { label: "Entertainment", href: "/sponsorships/entertainment" },
  { label: "Esports",       href: "/sponsorships/esports" },
  { label: "View All",      href: "/sponsorships" },
];

const LANGUAGE_SUB = [
  { label: "Español",   href: "?lang=es" },
  { label: "Português", href: "?lang=pt" },
  { label: "Deutsch",   href: "?lang=de" },
  { label: "日本語",     href: "?lang=ja" },
  { label: "한국어",     href: "?lang=ko" },
];

const ACCOUNT_LINKS = [
  { label: "Dashboard",          href: "/dashboard" },
  { label: "Profile & Settings", href: "/profile" },
  { label: "Transactions",       href: "/transactions" },
];

const XP_GUIDES = [
  { icon: "🎰", action: "Play any game",        xp: "+5 XP / spin" },
  { icon: "📅", action: "Daily login bonus",    xp: "+50 XP" },
  { icon: "🏆", action: "Complete a challenge", xp: "+100–500 XP" },
  { icon: "🎟️", action: "Join a race",           xp: "+25 XP" },
  { icon: "💰", action: "Place a bet",           xp: "+1 XP / $1" },
  { icon: "👥", action: "Refer a friend",        xp: "+500 XP" },
];

const LEVEL_REWARDS = [
  { level:  5, reward: "VIP Bronze + 50K GC" },
  { level: 10, reward: "VIP Silver + 150K GC" },
  { level: 20, reward: "VIP Gold + 500K GC" },
  { level: 30, reward: "VIP Diamond + 1M GC" },
  { level: 50, reward: "VIP Platinum + 5M GC" },
];

// ── sub-components ────────────────────────────────────────────────────────────

function NavItem({
  icon, label, href, active, disabled, collapsed,
}: {
  icon:      string;
  label:     string;
  href:      string;
  active:    boolean;
  disabled?: boolean;
  collapsed: boolean;
}) {
  const sharedStyle: React.CSSProperties = {
    background: active ? "var(--casino-surface-3)" : "transparent",
    color:      active ? "var(--casino-text)"       : "var(--casino-text-muted)",
    border:     active ? "1px solid var(--casino-border-bright)" : "1px solid transparent",
    opacity:    disabled ? 0.38 : 1,
  };

  if (collapsed) {
    const el = (
      <div
        title={label}
        className="flex items-center justify-center h-9 w-full rounded-xl transition-all hover:bg-white/5"
        style={sharedStyle}
      >
        <span className="text-base leading-none">{icon}</span>
      </div>
    );
    if (disabled) return <div className="cursor-not-allowed">{el}</div>;
    return <Link href={href} aria-current={active ? "page" : undefined}>{el}</Link>;
  }

  const inner = (
    <>
      <span className="text-base w-5 shrink-0 leading-none">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </>
  );

  if (disabled) {
    return (
      <div className="flex items-center gap-3 h-9 px-3 rounded-xl w-full cursor-not-allowed" style={sharedStyle}>
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-3 h-9 px-3 rounded-xl w-full transition-all hover:bg-white/5"
      style={sharedStyle}
    >
      {inner}
    </Link>
  );
}

function Accordion({
  icon, label, sub, defaultOpen, collapsed,
}: {
  icon:        string;
  label:       string;
  sub:         { label: string; href: string }[];
  defaultOpen?: boolean;
  collapsed:   boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  if (collapsed) {
    return (
      <div
        title={label}
        className="flex items-center justify-center h-9 w-full rounded-xl transition-all hover:bg-white/5"
        style={{ color: "var(--casino-text-muted)" }}
      >
        <span className="text-base leading-none">{icon}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 h-9 px-3 rounded-xl text-sm font-medium w-full transition-all hover:bg-white/5"
        style={{ color: "var(--casino-text-muted)" }}
      >
        <span className="text-base w-5 shrink-0 leading-none">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className={`text-xs shrink-0 inline-block transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="flex flex-col mt-0.5 ml-8 gap-0.5">
          {sub.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5"
              style={{ color: "var(--casino-text-muted)" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NavCard({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  return (
    <div
      className="rounded-xl p-1.5"
      style={{
        background: "var(--casino-surface-2)",
        border: "1px solid var(--casino-border)",
      }}
    >
      {collapsed ? <div className="flex flex-col gap-0.5">{children}</div> : children}
    </div>
  );
}

function LevelBar({ user, collapsed }: { user: User; collapsed: boolean }) {
  const [guideOpen,  setGuideOpen]  = useState(false);
  const [xpSection,  setXpSection]  = useState(false);
  const [lvlSection, setLvlSection] = useState(false);

  const pct    = Math.min(100, Math.round((user.xp / user.xpToNext) * 100));
  const xpFmt  = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  if (collapsed) {
    return (
      <div
        className="w-8 h-8 mx-auto rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
        title={`Level ${user.level} — ${xpFmt(user.xp)} / ${xpFmt(user.xpToNext)} XP`}
        style={{ background: "var(--casino-purple)", color: "white" }}
      >
        {user.level}
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}>
      {/* Name + level + guide toggle */}
      <div className="flex items-center gap-2 px-2.5 pt-2.5 pb-1.5">
        <span className="text-xs font-bold flex-1 truncate" style={{ color: "var(--casino-text)" }}>
          {user.username}
        </span>
        <span
          className="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0"
          style={{ background: "var(--casino-purple)", color: "white" }}
        >
          Lv.{user.level}
        </span>
        <button
          onClick={() => setGuideOpen((o) => !o)}
          aria-label="How to earn XP"
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all hover:brightness-125"
          style={{
            background: guideOpen ? "var(--casino-purple)" : "var(--casino-surface-3)",
            color: guideOpen ? "white" : "var(--casino-text-muted)",
          }}
        >
          ?
        </button>
      </div>

      {/* XP progress bar */}
      <div className="px-2.5 pb-2.5">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--casino-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--casino-purple) 0%, #a855f7 100%)" }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px]" style={{ color: "var(--casino-text-muted)" }}>{xpFmt(user.xp)} XP</span>
          <span className="text-[9px]" style={{ color: "var(--casino-text-muted)" }}>{xpFmt(user.xpToNext)} XP</span>
        </div>
      </div>

      {/* Guide panel */}
      {guideOpen && (
        <div style={{ borderTop: "1px solid var(--casino-border)" }}>
          {/* How to earn XP */}
          <button
            onClick={() => setXpSection((o) => !o)}
            className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold transition-all hover:bg-white/5"
            style={{ color: "var(--casino-text)" }}
          >
            <span>How to earn XP</span>
            <span className={`text-[10px] inline-block transition-transform duration-200 ${xpSection ? "rotate-180" : ""}`}>▾</span>
          </button>
          {xpSection && (
            <div className="px-2.5 pb-2 flex flex-col gap-1.5">
              {XP_GUIDES.map((g) => (
                <div key={g.action} className="flex items-center gap-2">
                  <span className="text-sm leading-none shrink-0">{g.icon}</span>
                  <span className="flex-1 text-[10px]" style={{ color: "var(--casino-text-muted)" }}>{g.action}</span>
                  <span className="text-[10px] font-semibold shrink-0" style={{ color: "var(--casino-purple-light, #a78bfa)" }}>{g.xp}</span>
                </div>
              ))}
            </div>
          )}

          {/* Level rewards */}
          <button
            onClick={() => setLvlSection((o) => !o)}
            className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold transition-all hover:bg-white/5"
            style={{ color: "var(--casino-text)", borderTop: "1px solid var(--casino-border)" }}
          >
            <span>Level Rewards</span>
            <span className={`text-[10px] inline-block transition-transform duration-200 ${lvlSection ? "rotate-180" : ""}`}>▾</span>
          </button>
          {lvlSection && (
            <div className="px-2.5 pb-2 flex flex-col gap-1.5">
              {LEVEL_REWARDS.map((r) => (
                <div key={r.level} className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      background: r.level <= user.level ? "var(--casino-purple)" : "var(--casino-surface-3)",
                      color:      r.level <= user.level ? "white" : "var(--casino-text-muted)",
                    }}
                  >
                    {r.level <= user.level ? "✓" : `Lv.${r.level}`}
                  </span>
                  <span
                    className="flex-1 text-[10px]"
                    style={{ color: r.level <= user.level ? "var(--casino-text-muted)" : "var(--casino-text)" }}
                  >
                    {r.reward}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return collapsed ? (
    // two right-pointing chevrons = "expand"
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
    </svg>
  ) : (
    // two left-pointing chevrons = "collapse"
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
    </svg>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function AppSidebar() {
  const { user, openAuth, logout, openCoins } = useAuth();
  const { brand } = useBrand();
  const pathname  = usePathname();
  const router    = useRouter();
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const mainNav = brand.features.showCrypto ? [...MAIN_NAV, CRYPTO_NAV] : MAIN_NAV;
  const c = collapsed; // shorthand

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
    <aside
      className="hidden md:flex flex-col shrink-0 sticky top-0 overflow-hidden transition-all duration-300"
      style={{
        width:       c ? 60 : 240,
        height:      "100vh",
        background:  "var(--casino-bg)",
        borderRight: "1px solid var(--casino-border)",
      }}
    >
      {/* ── Toggle header — same height as AppHeader (60px) ── */}
      <div
        className="shrink-0 flex items-center h-[60px] px-3"
        style={{
          borderBottom: "1px solid var(--casino-border)",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,.20), 0 2px 4px -1px rgba(0,0,0,.12)",
          justifyContent: c ? "center" : "space-between",
        }}
      >
        {!c && (
          <span className="text-[10px] font-bold uppercase tracking-widest select-none" style={{ color: "var(--casino-text-muted)" }}>
            Menu
          </span>
        )}
        <button
          onClick={() => setCollapsed((o) => !o)}
          aria-label={c ? "Expand sidebar" : "Collapse sidebar"}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/5"
          style={{ color: "var(--casino-text-muted)" }}
        >
          <CollapseIcon collapsed={c} />
        </button>
      </div>

      {/* ── Scrollable nav body ── */}
      <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-2">

        {/* Main nav */}
        <NavCard collapsed={c}>
          {mainNav.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} collapsed={c} />
          ))}
        </NavCard>

        {/* Auth-gated */}
        <NavCard collapsed={c}>
          {AUTH_GATED_NAV.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={pathname === item.href}
              disabled={!user}
              collapsed={c}
            />
          ))}
        </NavCard>

        {/* Games */}
        <NavCard collapsed={c}>
          {!c && (
            <p className="text-[10px] font-bold uppercase tracking-widest px-3 pb-1.5" style={{ color: "var(--casino-text-muted)" }}>
              Games
            </p>
          )}
          {GAME_CATS.map((item) => (
            <NavItem key={item.href} {...item} active={false} collapsed={c} />
          ))}
        </NavCard>

        {/* Promotions + Community */}
        <NavCard collapsed={c}>
          <Accordion icon="🎁" label="Promotions"  sub={PROMO_SUB}       collapsed={c} />
          {OTHER_NAV.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} collapsed={c} />
          ))}
          <Accordion icon="🤝" label="Sponsorships" sub={SPONSORSHIP_SUB} collapsed={c} />
        </NavCard>

        {/* Support + Language */}
        <NavCard collapsed={c}>
          <NavItem icon="🛡️" label="Responsible Gambling" href="/responsible-gambling" active={pathname === "/responsible-gambling"} collapsed={c} />
          <NavItem icon="🎧" label="Live Support"          href="/support"             active={pathname === "/support"}             collapsed={c} />
          <Accordion icon="🌐" label="English" sub={LANGUAGE_SUB} collapsed={c} />
        </NavCard>

      </div>

      {/* ── Auth footer — pinned at bottom ── */}
      <div
        className="shrink-0 flex flex-col gap-2 px-2 py-3"
        style={{ borderTop: "1px solid var(--casino-border)" }}
      >
        {user ? (
          <>
            {/* Balances */}
            {c ? (
              /* collapsed: stacked coin badges */
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs"
                  title={`GC: ${fmtCompact(user.gcBalance)}`}
                  style={{ background: "var(--casino-gold)", color: "#431407" }}
                >
                  G
                </div>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs"
                  title={`SC: ${fmtSC(user.scBalance)}`}
                  style={{ background: "var(--casino-sc)", color: "#083344" }}
                >
                  S
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div
                  className="flex-1 flex items-center gap-1.5 h-8 px-2 rounded-xl text-xs font-semibold"
                  style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border-bright)" }}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-black shrink-0" style={{ background: "var(--casino-gold)", color: "#431407", fontSize: 9 }}>G</span>
                  <span style={{ color: "var(--casino-gold)" }}>{fmtCompact(user.gcBalance)}</span>
                </div>
                <div
                  className="flex-1 flex items-center gap-1.5 h-8 px-2 rounded-xl text-xs font-semibold"
                  style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border-bright)" }}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-black shrink-0" style={{ background: "var(--casino-sc)", color: "#083344", fontSize: 9 }}>S</span>
                  <span style={{ color: "var(--casino-sc)" }}>{fmtSC(user.scBalance)}</span>
                </div>
              </div>
            )}

            {/* Get Coins */}
            <button
              onClick={openCoins}
              title="Get Coins"
              className="h-9 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "var(--casino-purple)", padding: c ? 0 : "0 1rem" }}
            >
              {c ? "+" : "+ Get Coins"}
            </button>

            {/* Level + XP bar */}
            <LevelBar user={user} collapsed={c} />

            {/* User row + dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title={c ? user.username : undefined}
                className="w-full flex items-center rounded-xl transition-all hover:bg-white/5"
                style={{
                  border:   "1px solid var(--casino-border-bright)",
                  gap:      c ? 0 : "0.625rem",
                  padding:  c ? "0.25rem" : "0.5rem 0.5rem",
                  justifyContent: c ? "center" : "flex-start",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "var(--casino-purple)" }}
                >
                  {user.avatarInitials}
                </div>
                {!c && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--casino-text)" }}>{user.username}</p>
                      <p className="text-[10px] truncate" style={{ color: "var(--casino-text-muted)" }}>{user.email}</p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: "var(--casino-text-muted)" }}>{menuOpen ? "▲" : "▼"}</span>
                  </>
                )}
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div
                    role="menu"
                    aria-label="Account menu"
                    className="absolute left-0 bottom-full mb-2 w-48 rounded-2xl shadow-2xl z-40 overflow-hidden"
                    style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border-bright)" }}
                  >
                    <div className="p-1.5 flex flex-col gap-0.5">
                      {ACCOUNT_LINKS.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center px-3 py-2 rounded-xl text-sm transition-colors hover:bg-white/5"
                          style={{ color: "var(--casino-text)" }}
                        >
                          {item.label}
                        </Link>
                      ))}
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
          /* Guest auth buttons */
          c ? (
            /* collapsed: stacked icon-only buttons */
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => openAuth("register")}
                title="Join Free"
                className="w-8 h-8 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 flex items-center justify-center"
                style={{ background: "var(--casino-purple)" }}
              >
                +
              </button>
              <button
                onClick={() => openAuth("login")}
                title="Sign In"
                className="w-8 h-8 rounded-xl text-sm transition-all hover:bg-white/5 flex items-center justify-center"
                style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)" }}
              >
                →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => openAuth("register")}
                className="h-9 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{ background: "var(--casino-purple)" }}
              >
                Join Free
              </button>
              <button
                onClick={() => openAuth("login")}
                className="h-9 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)" }}
              >
                Sign In
              </button>
            </div>
          )
        )}

        {/* Online indicator */}
        {!c && (
          <div className="flex items-center gap-1.5 px-1 text-xs" style={{ color: "var(--casino-text-muted)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            250K+ online now
          </div>
        )}
        {c && (
          <div className="flex justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title="250K+ online now" />
          </div>
        )}
      </div>
    </aside>
  );
}
