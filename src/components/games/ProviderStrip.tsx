"use client";

import { GAMES, PROVIDERS, PROVIDER_META, countByProvider } from "@/data/games";

type ProviderStripProps = {
  active:   string;                     // "All Providers" or a provider name
  onSelect: (provider: string) => void;
};

/**
 * Horizontal scrollable strip of provider cards on mobile, responsive grid
 * on larger viewports. Each card shows a colored letter chip, the provider
 * name, and the game count. Tapping a card filters the catalog to that
 * provider; "All" clears the filter.
 */
export function ProviderStrip({ active, onSelect }: ProviderStripProps) {
  const all = active === "All Providers";

  return (
    <section className="mb-6">
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--casino-text-muted)" }}>
        Providers
      </p>
      <div
        role="radiogroup"
        aria-label="Game provider"
        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 sm:overflow-visible"
      >
        {/* "All" card */}
        <ProviderCard
          letter="∗"
          color="var(--casino-purple)"
          name="All"
          count={GAMES.length}
          selected={all}
          onClick={() => onSelect("All Providers")}
        />
        {PROVIDERS.filter((p) => p !== "All Providers").map((name) => {
          const meta = PROVIDER_META[name];
          if (!meta) return null;
          return (
            <ProviderCard
              key={name}
              letter={meta.letter}
              color={meta.color}
              name={name}
              count={countByProvider(name)}
              selected={active === name}
              onClick={() => onSelect(name)}
            />
          );
        })}
      </div>
    </section>
  );
}

function ProviderCard({
  letter, color, name, count, selected, onClick,
}: {
  letter: string;
  color:  string;
  name:   string;
  count:  number;
  selected: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className="shrink-0 w-[120px] sm:w-auto rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center transition-all hover:scale-[1.03]"
      style={{
        background: selected ? "var(--casino-surface-3)" : "var(--casino-surface-2)",
        border: `1.5px solid ${selected ? color : "var(--casino-border)"}`,
        boxShadow: selected ? `0 0 0 3px ${color}22` : "none",
      }}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0"
        style={{ background: color }}
      >
        {letter}
      </span>
      <span className="text-xs font-semibold truncate w-full" style={{ color: "var(--casino-text)" }}>
        {name}
      </span>
      <span className="text-[10px]" style={{ color: "var(--casino-text-muted)" }}>
        {count} {count === 1 ? "game" : "games"}
      </span>
    </button>
  );
}
