"use client";

import Link from "next/link";
import { PROVIDERS, PROVIDER_META } from "@/data/games";

type Props = {
  active:    string;
  /** Filter mode: called when a pill is clicked. */
  onSelect?: (provider: string) => void;
  /** Navigation mode: each pill becomes a Link to the returned href. */
  getHref?:  (provider: string) => string;
};

export function ProviderPills({ active, onSelect, getHref }: Props) {
  const pills = [
    { name: "All Providers", letter: "∗", color: "var(--casino-purple)" },
    ...PROVIDERS
      .filter((p) => p !== "All Providers")
      .map((name) => ({ name, ...PROVIDER_META[name] }))
      .filter((p) => p.letter),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
      {pills.map(({ name, letter, color }) => {
        const sel = active === name;
        const className =
          "shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-all";
        const style: React.CSSProperties = {
          background: sel ? (name === "All Providers" ? "var(--casino-purple)" : color + "22") : "var(--casino-surface-2)",
          color:      sel ? (name === "All Providers" ? "white" : color)                        : "var(--casino-text-muted)",
          border:     `1px solid ${sel ? (name === "All Providers" ? "var(--casino-purple)" : color + "66") : "var(--casino-border)"}`,
        };
        const badge = (
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center font-black text-[9px] text-white shrink-0"
            style={{ background: color }}
          >
            {letter}
          </span>
        );
        const label = name === "All Providers" ? "All" : name;

        if (getHref) {
          return (
            <Link key={name} href={getHref(name)} className={className} style={style}>
              {badge}{label}
            </Link>
          );
        }
        return (
          <button key={name} onClick={() => onSelect?.(name)} className={className} style={style}>
            {badge}{label}
          </button>
        );
      })}
      <div className="shrink-0 w-1" aria-hidden />
    </div>
  );
}
