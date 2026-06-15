"use client";

import Link from "next/link";
import { useBrand } from "@/context/BrandContext";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  const { brand } = useBrand();

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16">
      {/* Decorative glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,var(--casino-purple),transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle,var(--casino-gold),transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-md mx-auto text-center">
        <div className="flex justify-center mb-6">
          <Logo size={56} letters={brand.logoLetters} />
        </div>

        <p
          className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5"
          style={{
            background: "var(--casino-purple-soft)",
            color: "var(--casino-purple-light)",
            border: "1px solid var(--casino-purple-bright)",
          }}
        >
          Error 404
        </p>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.05] mb-4">
          <span
            style={{
              backgroundImage: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Page Not Found
          </span>
        </h1>

        <p className="text-base mb-8" style={{ color: "var(--casino-text-muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist on {brand.name}.
          Try the lobby or browse our games instead.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="h-11 px-6 rounded-full text-sm font-semibold text-white inline-flex items-center justify-center transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))" }}
          >
            🏠 Back to Lobby
          </Link>
          <Link
            href="/games"
            className="h-11 px-6 rounded-full text-sm font-medium inline-flex items-center justify-center transition-all hover:bg-white/8"
            style={{
              border: "1px solid var(--casino-border-bright)",
              color: "var(--casino-text)",
            }}
          >
            🎰 Browse Games
          </Link>
        </div>
      </div>
    </div>
  );
}
