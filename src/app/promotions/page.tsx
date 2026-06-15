"use client";

import { useAuth } from "@/context/AuthContext";

const PROMOS = [
  {
    id: "welcome",
    tag: "New Players",
    title: "Welcome Pack",
    subtitle: "50,000 Gold Coins + 1.00 Sweep Coin",
    desc: "Create your free account and instantly receive 50,000 Gold Coins plus 1 Sweep Coin — no purchase required. Use GC to play any slot or table game from day one.",
    cta: "Claim Now",
    ctaColor: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))",
    highlight: true,
    bg: "linear-gradient(135deg,var(--casino-purple-soft),var(--casino-gold-soft))",
    border: "var(--casino-gold-bright)",
    emoji: "🎁",
    terms: "No purchase necessary. 18+ only. Available to new accounts only.",
  },
  {
    id: "daily",
    tag: "Every Day",
    title: "Daily Login Bonus",
    subtitle: "Up to 5,000 GC + 0.10 SC free",
    desc: "Log in every day to collect your daily reward. Your bonus grows the longer your login streak — hit 7 days in a row to unlock the weekly multiplier.",
    cta: "Log In to Collect",
    ctaColor: "linear-gradient(135deg,#059669,#0891b2)",
    highlight: false,
    bg: "linear-gradient(135deg,rgba(5,150,105,.1),rgba(8,145,178,.1))",
    border: "rgba(5,150,105,.3)",
    emoji: "📅",
    terms: "Resets every 24 hours. Must be logged in to collect.",
  },
  {
    id: "weekly",
    tag: "Every Monday",
    title: "Weekly Reload",
    subtitle: "Up to 100,000 GC every week",
    desc: "Every Monday you receive a reload bonus based on your activity the previous week. The more you play, the bigger your Monday surprise.",
    cta: "See Eligibility",
    ctaColor: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    highlight: false,
    bg: "linear-gradient(135deg,rgba(79,70,229,.1),rgba(124,58,237,.1))",
    border: "rgba(79,70,229,.3)",
    emoji: "📆",
    terms: "Amount varies based on previous week's play. Must have played at least 3 days.",
  },
  {
    id: "referral",
    tag: "Refer Friends",
    title: "Bring a Friend",
    subtitle: "10,000 GC + 0.25 SC per referral",
    desc: "Share your unique referral link. When a friend signs up and plays their first game, you both get rewarded. No limit on how many friends you can refer.",
    cta: "Get Your Link",
    ctaColor: "linear-gradient(135deg,#b45309,#f59e0b)",
    highlight: false,
    bg: "linear-gradient(135deg,rgba(180,83,9,.1),rgba(245,158,11,.1))",
    border: "rgba(245,158,11,.25)",
    emoji: "👥",
    terms: "Friend must register via your link and complete first game session.",
  },
  {
    id: "vip-cashback",
    tag: "VIP Members",
    title: "VIP Cashback",
    subtitle: "Up to 20% weekly cashback",
    desc: "Gold and above VIP tiers receive automatic cashback every Sunday based on net GC activity. The higher your tier, the higher your cashback percentage.",
    cta: "Check VIP Status",
    ctaColor: "linear-gradient(135deg,#7c3aed,#06b6d4)",
    highlight: false,
    bg: "linear-gradient(135deg,rgba(124,58,237,.1),rgba(6,182,212,.1))",
    border: "rgba(124,58,237,.3)",
    emoji: "👑",
    terms: "Available to Gold tier and above. Credited every Sunday.",
  },
  {
    id: "weekend",
    tag: "Fri–Sun",
    title: "Weekend Special",
    subtitle: "2× XP on all games",
    desc: "Every weekend, every game played earns double XP toward your VIP level. Level up faster, unlock higher tiers, and enjoy better perks — all weekend long.",
    cta: "Play This Weekend",
    ctaColor: "linear-gradient(135deg,#dc2626,#f97316)",
    highlight: false,
    bg: "linear-gradient(135deg,rgba(220,38,38,.1),rgba(249,115,22,.1))",
    border: "rgba(220,38,38,.25)",
    emoji: "🔥",
    terms: "Double XP applies Friday 00:00 UTC through Sunday 23:59 UTC.",
  },
];

export default function PromotionsPage() {
  const { user, openAuth } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden py-14 text-center"
        style={{ background: "var(--casino-surface)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-40%] left-[10%] w-96 h-96 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle,var(--casino-purple),transparent 70%)" }} />
          <div className="absolute bottom-[-40%] right-[5%] w-80 h-80 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle,var(--casino-gold),transparent 70%)" }} />
        </div>
        <div className="relative max-w-2xl mx-auto px-4">
          <span className="text-4xl block mb-4">🎁</span>
          <h1 className="text-3xl md:text-4xl font-black mb-3">
            Bonuses &amp;{" "}
            <span style={{
              backgroundImage: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Promotions</span>
          </h1>
          <p className="text-base mb-6" style={{ color: "var(--casino-text-muted)" }}>
            Free coins, weekly rewards, cashback, and more — all at no cost to you.
          </p>
          {!user && (
            <button
              onClick={() => openAuth("register")}
              className="h-11 px-8 rounded-full text-sm font-bold text-white transition-all hover:scale-105 hover:brightness-110"
              style={{ background: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))" }}
            >
              Claim Welcome Bonus →
            </button>
          )}
        </div>
      </section>

      {/* Promo cards */}
      <section className="max-w-screen-xl mx-auto px-4 py-10 space-y-4">
        {PROMOS.map((p) => (
          <div
            key={p.id}
            id={p.id}
            className="rounded-2xl p-6"
            style={{
              background: p.bg,
              border: `1px solid ${p.border}`,
              outline: p.highlight ? `2px solid var(--casino-gold-bright)` : "none",
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              {/* Icon */}
              <div
                className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}
              >
                {p.emoji}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,.08)", color: "var(--casino-text-muted)" }}
                  >
                    {p.tag}
                  </span>
                  {p.highlight && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--casino-gold-soft)", color: "var(--casino-gold)" }}
                    >
                      ★ Best Offer
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black mb-0.5">{p.title}</h2>
                <p className="text-sm font-bold mb-2" style={{ color: "var(--casino-gold)" }}>
                  {p.subtitle}
                </p>
                <p className="text-sm leading-6 mb-3" style={{ color: "var(--casino-text-muted)" }}>
                  {p.desc}
                </p>
                <p className="text-xs" style={{ color: "var(--casino-text-muted)", opacity: 0.7 }}>
                  T&amp;Cs: {p.terms}
                </p>
              </div>

              {/* CTA */}
              <div className="shrink-0">
                <button
                  onClick={() => !user && openAuth("register")}
                  className="h-10 px-6 rounded-full text-sm font-bold text-white whitespace-nowrap transition-all hover:scale-105 hover:brightness-110"
                  style={{ background: p.ctaColor }}
                >
                  {user ? p.cta : "Sign Up to Claim"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Responsible gambling reminder */}
      <div className="max-w-screen-xl mx-auto px-4 pb-10">
        <p className="text-xs text-center" style={{ color: "var(--casino-text-muted)", opacity: 0.6 }}>
          All promotions are for entertainment purposes only. No real money gambling. 18+ only. Play responsibly.
        </p>
      </div>
    </div>
  );
}
