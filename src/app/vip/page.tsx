"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { VIP_TIERS as TIERS } from "@/data/vip-tiers";

const BENEFITS = [
  { key: "cashback",        label: "Weekly Cashback" },
  { key: "weeklyBonus",     label: "Weekly Bonus" },
  { key: "monthlyBonus",    label: "Monthly Bonus" },
  { key: "supportPriority", label: "Support" },
  { key: "exclusiveGames",  label: "Exclusive Games",   bool: true },
  { key: "customLimits",    label: "Custom Coin Limits", bool: true },
  { key: "dedicatedHost",   label: "Dedicated VIP Host", bool: true },
];

const HOW_TO_EARN = [
  { icon: "🎰", title: "Play Slots", desc: "Every spin earns XP. Higher bet = more XP per spin." },
  { icon: "🃏", title: "Table Games", desc: "Each hand of Blackjack, Poker or Baccarat awards XP." },
  { icon: "📅", title: "Daily Logins", desc: "Streak login bonuses include XP rewards." },
  { icon: "👥", title: "Refer Friends", desc: "Earn 500 XP for every friend who joins and plays." },
  { icon: "🎁", title: "Special Events", desc: "Limited-time events award XP multipliers." },
];

// ── page ───────────────────────────────────────────────────────────────────

export default function VIPPage() {
  const { user, openAuth } = useAuth();

  const currentTier = user
    ? TIERS.find((t) => {
        const [min, max] = t.levels.split("–").map(Number);
        return user.level >= min && user.level <= max;
      }) ?? TIERS[0]
    : null;

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden py-16 text-center"
        style={{ background: "var(--casino-surface)" }}
      >
        <div className="max-w-3xl mx-auto px-4">
          <span className="text-5xl block mb-4">👑</span>
          <h1 className="text-3xl md:text-5xl font-black mb-4">
            VIP{" "}
            <span style={{ color: "var(--casino-gold)" }}>Rewards Program</span>
          </h1>
          <p className="text-base md:text-lg mb-8 max-w-xl mx-auto" style={{ color: "var(--casino-text-muted)" }}>
            Five tiers, exclusive perks, and cashback that gets bigger the higher you climb.
            Every game you play earns XP toward your next level.
          </p>

          {/* Tier badges row */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: `${tier.glow}`,
                  border: `1px solid ${tier.color}55`,
                  color: tier.color,
                }}
              >
                <span>{tier.emoji}</span> {tier.name}
              </div>
            ))}
          </div>

          {/* CTA */}
          {user && currentTier && (
            <div
              className="inline-flex items-center gap-3 mt-8 px-5 py-3 rounded-2xl"
              style={{ background: `${currentTier.glow}`, border: `1px solid ${currentTier.color}44` }}
            >
              <span className="text-2xl">{currentTier.emoji}</span>
              <div className="text-left">
                <p className="text-xs" style={{ color: "var(--casino-text-muted)" }}>Current Status</p>
                <p className="text-sm font-bold" style={{ color: currentTier.color }}>
                  {currentTier.name} · Level {user.level}
                </p>
              </div>
              <Link
                href="/dashboard"
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-white/10"
                style={{ color: "var(--casino-text)" }}
              >
                View Progress →
              </Link>
            </div>
          )}

          {!user && (
            <button
              onClick={() => openAuth("register")}
              className="mt-8 h-11 px-8 rounded-full text-sm font-bold text-white transition-all hover:scale-105 hover:brightness-110"
              style={{ background: "var(--casino-purple)" }}
            >
              Start Earning XP Free →
            </button>
          )}
        </div>
      </section>

      {/* Tier cards */}
      <section className="max-w-screen-xl mx-auto px-4 py-10">
        <h2 className="text-xl font-black text-center mb-6">Choose Your Path</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="relative rounded-2xl p-5 flex flex-col gap-3 transition-all hover:scale-[1.02]"
              style={{
                background: tier.popular ? tier.glow : "var(--casino-surface-2)",
                border: `1.5px solid ${tier.popular ? tier.color : "var(--casino-border)"}`,
              }}
            >
              {tier.popular && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap"
                  style={{ background: tier.color, color: "#431407" }}
                >
                  ★ Most Popular
                </span>
              )}
              <div className="text-3xl">{tier.emoji}</div>
              <div>
                <p className="font-black text-base" style={{ color: tier.color }}>{tier.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>
                  Levels {tier.levels}
                </p>
              </div>
              <div className="h-px" style={{ background: "var(--casino-border)" }} />
              <ul className="space-y-2">
                <BenefitRow label="Cashback"  value={tier.cashback} color={tier.color} />
                <BenefitRow label="Weekly"    value={tier.weeklyBonus} color={tier.color} />
                <BenefitRow label="Monthly"   value={tier.monthlyBonus} color={tier.color} />
                <BenefitRow label="Support"   value={tier.supportPriority} color={tier.color} />
                <BoolRow    label="Exclusive Games"  active={tier.exclusiveGames} />
                <BoolRow    label="Custom Limits"    active={tier.customLimits} />
                <BoolRow    label="VIP Host"         active={tier.dedicatedHost} />
              </ul>
              <div className="mt-auto pt-2">
                <p className="text-[10px] font-semibold" style={{ color: "var(--casino-text-muted)" }}>
                  From {tier.xpRequired}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to earn XP */}
      <section
        className="py-12"
        style={{ background: "var(--casino-surface)" }}
      >
        <div className="max-w-screen-xl mx-auto px-4">
          <h2 className="text-xl font-black text-center mb-2">How to Earn XP</h2>
          <p className="text-sm text-center mb-8" style={{ color: "var(--casino-text-muted)" }}>
            XP is earned automatically — just play and level up.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {HOW_TO_EARN.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-4 text-center"
                style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
              >
                <span className="text-3xl block mb-2">{item.icon}</span>
                <p className="text-sm font-bold mb-1">{item.title}</p>
                <p className="text-xs leading-5" style={{ color: "var(--casino-text-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-xl font-black text-center mb-6">VIP FAQ</h2>
        <div className="space-y-3">
          {[
            ["Is the VIP program free?", "Yes — completely free. Every account automatically earns XP just by playing games."],
            ["Can I lose my VIP tier?", "No. Once you reach a tier, you keep it permanently. Levels only go up."],
            ["When is cashback paid?", "Every Sunday, cashback for the previous week is credited to your GC balance automatically."],
            ["How long does it take to reach Gold?", "Active players typically reach Gold (Level 7) within 2–4 weeks of regular play."],
          ].map(([q, a]) => (
            <details
              key={q}
              className="rounded-2xl overflow-hidden group"
              style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
            >
              <summary
                className="px-5 py-4 text-sm font-semibold cursor-pointer list-none flex items-center justify-between"
                style={{ color: "var(--casino-text)" }}
              >
                {q}
                <span className="text-lg transition-transform group-open:rotate-45" style={{ color: "var(--casino-text-muted)" }}>+</span>
              </summary>
              <p className="px-5 pb-4 text-sm leading-6" style={{ color: "var(--casino-text-muted)" }}>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function BenefitRow({ label, value, color }: { label: string; value: string; color: string }) {
  const empty = value === "—";
  return (
    <li className="flex justify-between items-center">
      <span className="text-[10px]" style={{ color: "var(--casino-text-muted)" }}>{label}</span>
      <span className="text-[10px] font-semibold" style={{ color: empty ? "var(--casino-text-muted)" : color }}>
        {value}
      </span>
    </li>
  );
}

function BoolRow({ label, active }: { label: string; active: boolean }) {
  return (
    <li className="flex justify-between items-center">
      <span className="text-[10px]" style={{ color: "var(--casino-text-muted)" }}>{label}</span>
      <span className="text-xs">{active ? "✅" : "❌"}</span>
    </li>
  );
}
