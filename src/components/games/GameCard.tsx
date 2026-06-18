"use client";

import { ReactNode } from "react";
import type { Game } from "@/data/games";

type GameCardProps = {
  game:          Game;
  onClick?:      () => void;
  overlayLabel?: string;
  hideBadge?:    boolean;
  footer?:       ReactNode;
};

export function GameCard({
  game,
  onClick,
  overlayLabel = "Play Free",
  hideBadge    = false,
  footer,
}: GameCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-1"
      style={{ background: "var(--casino-surface-2)" }}
    >
      {/* Portrait thumbnail — 3:4 ratio */}
      <div className="relative w-full" style={{ paddingTop: "134.15%" }}>
        {/* Background / placeholder */}
        <div
          className="absolute inset-0 flex items-center justify-center text-5xl"
          style={{ background: game.bg }}
        >
          {game.emoji}
        </div>

        {/* Always-visible gradient at bottom — name + provider */}
        <div
          className="absolute inset-x-0 bottom-0 px-2 pt-8 pb-2"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)" }}
        >
          <p className="text-sm font-semibold text-white truncate leading-tight">{game.name}</p>
          <p className="text-xs text-white/55 truncate">{game.provider}</p>
        </div>

        {/* Badge */}
        {!hideBadge && game.badge && (
          <span
            className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md z-10"
            style={{
              background: game.badge === "Live" ? "#dc2626"
                        : game.badge === "New"  ? "var(--casino-purple)"
                        : game.badge === "Hot"  ? "#b45309"
                        : "rgba(0,0,0,.55)",
              color: "white",
            }}
          >
            {game.badge}
          </span>
        )}

        {/* Hover tint + play pill */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,.35)" }}
        >
          <span
            className="h-7 px-3 rounded-full text-[11px] font-bold text-white flex items-center gap-1"
            style={{ background: "var(--casino-purple)" }}
          >
            ▶ {overlayLabel}
          </span>
        </div>
      </div>

      {footer && <div className="px-2 py-1.5">{footer}</div>}
    </div>
  );
}
