"use client";

import Link from "next/link";
import { useBrand } from "@/context/BrandContext";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  const { brand } = useBrand();

  return (
    <div className="relative overflow-hidden min-h-screen flex items-center justify-center py-16">
      <div className="max-w-md mx-auto text-center">
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

        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.05] mb-4"
          style={{ color: "var(--casino-purple-light)" }}>
          Page Not Found
        </h1>

        <p className="text-base mb-8" style={{ color: "var(--casino-text-muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist on {brand.name}.
          Try the lobby or browse our games instead.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="h-11 px-6 rounded-full text-sm font-semibold text-white inline-flex items-center justify-center transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{ background: "var(--casino-purple)" }}
          >
            🏠 Back to Casino
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
