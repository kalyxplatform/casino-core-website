"use client";

import { ReactNode } from "react";
import type { Game } from "@/data/games";

type GameCardProps = {
  game:          Game;
  onClick?:      () => void;
  /** Text shown on the hover overlay button. Defaults to "Play Free". */
  overlayLabel?: string;
  /** Show provider name under the play button on hover (library only). */
  showProvider?: boolean;
  /** Hide the corner badge (e.g. on the dashboard "Recent Games" strip). */
  hideBadge?:    boolean;
  /** Extra content rendered under the game name + category. */
  footer?:       ReactNode;
};

/**
 * Single normalized game tile. Always renders an aspect-[4/3] thumbnail so
 * lobby, library, and dashboard line up. All three call sites differ only in
 * the overlay label, the provider line, and any extra footer content.
 */
export function GameCard({
  game,
  onClick,
  overlayLabel = "Play Free",
  showProvider = false,
  hideBadge    = false,
  footer,
}: GameCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.04] hover:shadow-2xl"
      style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
    >
      {/* Thumbnail — always 4:3 */}
      <div
        className="aspect-[4/3] flex items-center justify-center text-4xl"
        style={{ background: game.bg }}
      >
        {game.emoji}
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-x-0 top-0 aspect-[4/3] flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all"
        style={{ background: "rgba(0,0,0,.6)", backdropFilter: "blur(2px)" }}
      >
        <span
          className="h-8 px-5 rounded-full text-xs font-bold text-white flex items-center"
          style={{ background: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))" }}
        >
          {overlayLabel}
        </span>
        {showProvider && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,.7)" }}>{game.provider}</span>
        )}
      </div>

      {/* Badge */}
      {!hideBadge && game.badge && (
        <span
          className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
          style={{
            background: game.badge === "Live" ? "#dc2626"
                      : game.badge === "New"  ? "var(--casino-purple)"
                      : "rgba(0,0,0,.6)",
            color: "white",
          }}
        >
          {game.badge}
        </span>
      )}

      {/* Info strip */}
      <div className="px-2.5 py-2">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--casino-text)" }}>{game.name}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--casino-text-muted)" }}>{game.cat}</p>
        {footer}
      </div>
    </div>
  );
}
