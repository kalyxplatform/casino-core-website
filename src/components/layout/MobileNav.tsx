"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBrand } from "@/context/BrandContext";

const GUEST_ITEMS = [
  { icon: "🏠", label: "Casino",    href: "/" },
  { icon: "🎰", label: "Games",    href: "/games" },
  { icon: "🎁", label: "Promos",   href: "/promotions" },
  { icon: "👑", label: "VIP",      href: "/vip" },
];

const AUTH_ITEMS = [
  { icon: "🏠", label: "Casino",     href: "/" },
  { icon: "🎰", label: "Games",     href: "/games" },
  { icon: "🎁", label: "Promos",    href: "/promotions" },
  { icon: "📊", label: "Dashboard", href: "/dashboard" },
  { icon: "👤", label: "Profile",   href: "/profile" },
];

const CRYPTO_ITEM = { icon: "🪙", label: "Crypto", href: "/crypto" };

export default function MobileNav() {
  const { user, openAuth } = useAuth();
  const { brand } = useBrand();
  const pathname = usePathname();
  const base = user ? AUTH_ITEMS : GUEST_ITEMS;
  const items = brand.features.showCrypto ? [...base, CRYPTO_ITEM] : base;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{
        background: "rgba(19,35,45,.96)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--casino-border-bright)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors"
            style={{ color: active ? "var(--casino-gold)" : "var(--casino-text-muted)" }}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
            {active && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: "var(--casino-gold)" }}
              />
            )}
          </Link>
        );
      })}

      {/* Join CTA if logged out */}
      {!user && (
        <button
          onClick={() => openAuth("register")}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
          style={{ color: "var(--casino-purple-light)" }}
        >
          <span className="text-xl leading-none">✨</span>
          <span className="text-[9px] font-semibold tracking-wide">Join Free</span>
        </button>
      )}
    </nav>
  );
}
