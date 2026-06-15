"use client";

import { useState, useRef, useCallback } from "react";
import { useBrand } from "@/context/BrandContext";
import { useModal } from "@/hooks/useModal";
import { BrandColors } from "@/brands";

// ── colour token groups ───────────────────────────────────────────────────

type TokenEntry = {
  key: keyof BrandColors;
  label: string;
  isRgba?: boolean;   // uses text input instead of color picker
};

const TOKEN_GROUPS: { heading: string; tokens: TokenEntry[] }[] = [
  {
    heading: "Brand Identity",
    tokens: [
      { key: "primary",      label: "Primary Color" },
      { key: "primaryLight", label: "Primary Light" },
      { key: "secondary",    label: "Secondary Color" },
    ],
  },
  {
    heading: "Backgrounds",
    tokens: [
      { key: "bg",       label: "Page Background" },
      { key: "surface",  label: "Surface" },
      { key: "surface2", label: "Surface 2" },
      { key: "surface3", label: "Surface 3" },
    ],
  },
  {
    heading: "Borders",
    tokens: [
      { key: "border",       label: "Border",       isRgba: true },
      { key: "borderBright", label: "Border Bright", isRgba: true },
    ],
  },
  {
    heading: "Text",
    tokens: [
      { key: "text",      label: "Primary Text" },
      { key: "textMuted", label: "Muted Text" },
    ],
  },
  {
    heading: "Coins",
    tokens: [
      { key: "gc", label: "Gold Coin (GC)" },
      { key: "sc", label: "Sweep Coin (SC)" },
    ],
  },
  {
    heading: "Semantic",
    tokens: [
      { key: "success", label: "Success" },
      { key: "error",   label: "Error" },
    ],
  },
];

// ── main component ─────────────────────────────────────────────────────────

export default function ThemeEditor() {
  const [open, setOpen]         = useState(false);
  const [copied, setCopied]     = useState(false);
  const { brand, brands, setBrandId, updateColor, resetColors, exportConfig } = useBrand();
  const close = useCallback(() => setOpen(false), []);
  const drawerProps = useModal<HTMLElement>(open, close, { ariaLabel: "Theme editor" });

  function handleExport() {
    navigator.clipboard.writeText(exportConfig()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Theme Editor"
        aria-label={open ? "Close theme editor" : "Open theme editor"}
        aria-expanded={open}
        aria-controls="theme-editor-drawer"
        className="fixed bottom-20 md:bottom-6 right-4 z-50 w-11 h-11 rounded-2xl flex items-center justify-center text-lg shadow-xl transition-all hover:scale-110"
        style={{
          background: open ? "var(--casino-purple)" : "var(--casino-surface-2)",
          border: "1.5px solid var(--casino-border-bright)",
          color: open ? "#fff" : "var(--casino-text-muted)",
        }}
      >
        🎨
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,.4)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        {...drawerProps}
        id="theme-editor-drawer"
        aria-hidden={!open}
        className="fixed top-0 right-0 bottom-0 z-50 w-80 flex flex-col shadow-2xl transition-transform duration-300"
        style={{
          background: "var(--casino-surface)",
          borderLeft: "1px solid var(--casino-border-bright)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--casino-border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎨</span>
            <span className="font-black text-sm">Theme Editor</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close theme editor"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-lg transition-colors hover:bg-white/10"
            style={{ color: "var(--casino-text-muted)" }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Brand switcher */}
          <section>
            <SectionLabel>Brand</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {brands.map((b) => {
                const isActive = brand.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setBrandId(b.id)}
                    className="rounded-2xl p-3 text-left transition-all hover:scale-[1.02]"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg,${b.colors.primary}22,${b.colors.secondary}18)`
                        : "var(--casino-surface-2)",
                      border: `1.5px solid ${isActive ? b.colors.primary : "var(--casino-border)"}`,
                    }}
                  >
                    {/* Mini logo */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] text-white mb-2"
                      style={{ background: `linear-gradient(135deg,${b.colors.primary},${b.colors.secondary})` }}
                    >
                      {b.logoLetters}
                    </div>
                    <p className="text-xs font-bold leading-tight" style={{ color: isActive ? b.colors.primary : "var(--casino-text)" }}>
                      {b.name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--casino-text-muted)" }}>
                      {b.tagline}
                    </p>
                    {isActive && (
                      <span
                        className="text-[9px] font-bold mt-1.5 inline-block px-1.5 py-0.5 rounded-full"
                        style={{ background: `${b.colors.primary}22`, color: b.colors.primary }}
                      >
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <Divider />

          {/* Color token groups */}
          {TOKEN_GROUPS.map((group) => (
            <section key={group.heading}>
              <SectionLabel>{group.heading}</SectionLabel>
              <div className="space-y-2">
                {group.tokens.map((entry) => (
                  <ColorRow
                    key={entry.key}
                    label={entry.label}
                    value={brand.colors[entry.key]}
                    isRgba={entry.isRgba}
                    onChange={(v) => updateColor(entry.key, v)}
                  />
                ))}
              </div>
            </section>
          ))}

          <Divider />

          {/* Live preview pill */}
          <div
            className="rounded-2xl p-3 text-center"
            style={{ background: `linear-gradient(135deg,${brand.colors.primary}18,${brand.colors.secondary}12)`, border: `1px solid ${brand.colors.primary}44` }}
          >
            <div
              className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center font-black text-xs text-white"
              style={{ background: `linear-gradient(135deg,${brand.colors.primary},${brand.colors.secondary})` }}
            >
              {brand.logoLetters}
            </div>
            <p className="text-xs font-bold" style={{ color: brand.colors.primary }}>{brand.name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--casino-text-muted)" }}>{brand.tagline}</p>
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="px-4 py-3 flex gap-2 shrink-0"
          style={{ borderTop: "1px solid var(--casino-border)" }}
        >
          <button
            onClick={resetColors}
            className="flex-1 h-9 rounded-xl text-xs font-semibold transition-colors hover:bg-white/8"
            style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text-muted)" }}
          >
            Reset Colors
          </button>
          <button
            onClick={handleExport}
            className="flex-1 h-9 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: `linear-gradient(135deg,${brand.colors.primary},${brand.colors.secondary})` }}
          >
            {copied ? "✓ Copied!" : "Export Config"}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── color row ─────────────────────────────────────────────────────────────

function ColorRow({
  label, value, isRgba, onChange,
}: {
  label: string; value: string; isRgba?: boolean; onChange: (v: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2.5">
      {/* Swatch / trigger */}
      <div className="relative shrink-0">
        {isRgba ? (
          <div
            className="w-7 h-7 rounded-lg border"
            style={{ background: value, borderColor: "var(--casino-border-bright)" }}
          />
        ) : (
          <>
            <button
              onClick={() => pickerRef.current?.click()}
              className="w-7 h-7 rounded-lg transition-transform hover:scale-110 border"
              style={{ background: value, borderColor: "var(--casino-border-bright)" }}
              title={`Edit ${label}`}
            />
            <input
              ref={pickerRef}
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute opacity-0 w-0 h-0 top-0 left-0 pointer-events-none"
            />
          </>
        )}
      </div>

      {/* Label */}
      <span className="text-xs flex-1" style={{ color: "var(--casino-text-muted)" }}>
        {label}
      </span>

      {/* Value input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-24 h-6 px-2 rounded-lg text-[10px] font-mono outline-none"
        style={{
          background: "var(--casino-surface-2)",
          border: "1px solid var(--casino-border)",
          color: "var(--casino-text-muted)",
        }}
      />
    </div>
  );
}

// ── atoms ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--casino-text-muted)" }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px" style={{ background: "var(--casino-border)" }} />;
}
