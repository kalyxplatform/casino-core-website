"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { useBrand } from "@/context/BrandContext";

const LINKS = {
  Games: [
    { label: "Slots",       href: "/games?cat=slots" },
    { label: "Table Games", href: "/games?cat=table" },
    { label: "Live Casino", href: "/games?cat=live" },
    { label: "Jackpots",    href: "/games?cat=jackpot" },
    { label: "New Games",   href: "/games?cat=new" },
  ],
  Promotions: [
    { label: "Welcome Bonus",  href: "/promotions#welcome" },
    { label: "Daily Bonus",    href: "/promotions#daily" },
    { label: "Refer a Friend", href: "/promotions#referral" },
    { label: "VIP Program",    href: "/vip" },
    { label: "Weekly Reload",  href: "/promotions#weekly" },
  ],
  Support: [
    { label: "Help Center",      href: "/help" },
    { label: "Live Chat",        href: "/chat" },
    { label: "Contact Us",       href: "/contact" },
    { label: "Responsible Play", href: "/responsible-gambling" },
    { label: "FAQ",              href: "/faq" },
  ],
  Legal: [
    { label: "Terms of Service",  href: "/terms" },
    { label: "Privacy Policy",    href: "/privacy" },
    { label: "Cookie Policy",     href: "/cookies" },
    { label: "Sweepstakes Rules", href: "/rules" },
    { label: "KYC Policy",        href: "/kyc" },
  ],
};

export default function Footer() {
  const { brand } = useBrand();
  return (
    <footer style={{ background: "var(--casino-surface)", borderTop: "1px solid var(--casino-border)" }}>
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Logo size={28} letters={brand.logoLetters} />
              <span className="font-bold text-sm">{brand.name}</span>
            </div>
            <p className="text-xs leading-5 mb-4" style={{ color: "var(--casino-text-muted)" }}>
              {brand.tagline}
            </p>
            {/* Social icons */}
            <div className="flex gap-2">
              {["𝕏", "f", "in", "📧"].map((s, i) => (
                <button
                  key={i}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors hover:bg-white/10"
                  style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)", color: "var(--casino-text-muted)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, items]) => (
            <div key={heading}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--casino-text-muted)" }}>
                {heading}
              </p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-xs transition-colors hover:underline"
                      style={{ color: "var(--casino-text-muted)" }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Responsible gambling */}
        <div
          className="rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
        >
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
            style={{ background: "rgba(16,185,129,.15)", color: "var(--casino-success)" }}
          >
            18+
          </div>
          <p className="text-xs leading-5" style={{ color: "var(--casino-text-muted)" }}>
            <strong style={{ color: "var(--casino-text)" }}>Play Responsibly.</strong>{" "}
            CasinoCore is a free-to-play social casino. No real money is wagered.
            Sweep Coins can be redeemed for prizes subject to eligibility rules.
            If you or someone you know has a gambling problem, please call the National Problem Gambling Helpline:{" "}
            <strong style={{ color: "var(--casino-text)" }}>1-800-522-4700</strong>.
          </p>
          <div className="flex gap-2 shrink-0">
            {["🛡️ SSL", "🔒 Fair Play", "✅ Licensed"].map((badge) => (
              <span
                key={badge}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap"
                style={{ background: "var(--casino-surface-3)", color: "var(--casino-text-muted)" }}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid var(--casino-border)" }}
        >
          <p className="text-[11px]" style={{ color: "var(--casino-text-muted)" }}>
            © 2026 {brand.name} Ltd. All rights reserved. {brand.name} is operated for entertainment purposes only.
            No purchase necessary. Void where prohibited.
          </p>
          <div className="flex gap-4">
            {["Terms", "Privacy", "Cookies"].map((label) => (
              <Link
                key={label}
                href={`/${label.toLowerCase()}`}
                className="text-[11px] hover:underline"
                style={{ color: "var(--casino-text-muted)" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
