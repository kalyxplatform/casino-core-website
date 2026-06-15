export type GameBadge = "Hot" | "New" | "Top" | "Live" | "🔥";

export type Game = {
  id:       number;
  name:     string;
  cat:      "Slots" | "Table" | "Live Casino" | "Jackpot";
  provider: string;
  badge:    GameBadge | null;
  bg:       string;   // CSS gradient
  emoji:    string;
};

export const GAMES: Game[] = [
  // Slots
  { id: 1,  name: "Starburst Wilds",    cat: "Slots",       provider: "NetEnt",      badge: "Hot",  bg: "linear-gradient(135deg,#f59e0b,#ef4444)", emoji: "⭐"  },
  { id: 2,  name: "Dragon's Fortune",   cat: "Slots",       provider: "Pragmatic",   badge: "New",  bg: "linear-gradient(135deg,#7c3aed,#dc2626)", emoji: "🐉" },
  { id: 3,  name: "Book of Gold",       cat: "Slots",       provider: "Playson",     badge: null,   bg: "linear-gradient(135deg,#b45309,#f59e0b)", emoji: "📖" },
  { id: 4,  name: "Neon City 3000",     cat: "Slots",       provider: "NetEnt",      badge: "Hot",  bg: "linear-gradient(135deg,#06b6d4,#7c3aed)", emoji: "🌆" },
  { id: 5,  name: "Lucky Shamrock",     cat: "Slots",       provider: "EGT",         badge: null,   bg: "linear-gradient(135deg,#059669,#16a34a)", emoji: "🍀" },
  { id: 6,  name: "Diamond Rush",       cat: "Slots",       provider: "IGT",         badge: "Top",  bg: "linear-gradient(135deg,#2563eb,#06b6d4)", emoji: "💎" },
  { id: 7,  name: "Space Spins",        cat: "Slots",       provider: "Pragmatic",   badge: "New",  bg: "linear-gradient(135deg,#1e1b4b,#4f46e5)", emoji: "🚀" },
  { id: 8,  name: "Aztec Gold",         cat: "Slots",       provider: "Playson",     badge: null,   bg: "linear-gradient(135deg,#92400e,#d97706)", emoji: "🏺" },
  { id: 9,  name: "Wild West Cash",     cat: "Slots",       provider: "WMS",         badge: null,   bg: "linear-gradient(135deg,#78350f,#92400e)", emoji: "🤠" },
  { id: 10, name: "Candy Kingdom",      cat: "Slots",       provider: "NetEnt",      badge: "Hot",  bg: "linear-gradient(135deg,#db2777,#9333ea)", emoji: "🍭" },
  { id: 11, name: "Ocean Depths",       cat: "Slots",       provider: "IGT",         badge: null,   bg: "linear-gradient(135deg,#0c4a6e,#0891b2)", emoji: "🐬" },
  { id: 12, name: "Ninja Fortune",      cat: "Slots",       provider: "Pragmatic",   badge: "New",  bg: "linear-gradient(135deg,#1a1a2e,#16213e)", emoji: "🥷" },
  { id: 13, name: "Viking Raid",        cat: "Slots",       provider: "EGT",         badge: null,   bg: "linear-gradient(135deg,#374151,#6b7280)", emoji: "⚔️" },
  { id: 14, name: "Treasure Island",    cat: "Slots",       provider: "Playson",     badge: "Hot",  bg: "linear-gradient(135deg,#0369a1,#f59e0b)", emoji: "🏝️" },
  { id: 15, name: "Fire Phoenix",       cat: "Slots",       provider: "WMS",         badge: null,   bg: "linear-gradient(135deg,#dc2626,#f97316)", emoji: "🔥" },
  { id: 16, name: "Egyptian Riches",    cat: "Slots",       provider: "IGT",         badge: null,   bg: "linear-gradient(135deg,#854d0e,#ca8a04)", emoji: "🐫" },
  // Table
  { id: 17, name: "Blackjack Pro",      cat: "Table",       provider: "Evolution",   badge: null,   bg: "linear-gradient(135deg,#1e1e38,#374151)", emoji: "🃏" },
  { id: 18, name: "Poker Legends",      cat: "Table",       provider: "Microgaming", badge: null,   bg: "linear-gradient(135deg,#134e4a,#0f766e)", emoji: "♠️" },
  { id: 19, name: "Baccarat Elite",     cat: "Table",       provider: "Evolution",   badge: null,   bg: "linear-gradient(135deg,#312e81,#4f46e5)", emoji: "🎴" },
  { id: 20, name: "American Roulette",  cat: "Table",       provider: "Pragmatic",   badge: null,   bg: "linear-gradient(135deg,#1e3a5f,#2563eb)", emoji: "🎯" },
  // Live Casino
  { id: 21, name: "Live Roulette",      cat: "Live Casino", provider: "Evolution",   badge: "Live", bg: "linear-gradient(135deg,#991b1b,#b45309)", emoji: "🎡" },
  { id: 22, name: "Live Baccarat VIP",  cat: "Live Casino", provider: "Evolution",   badge: "Live", bg: "linear-gradient(135deg,#312e81,#7c3aed)", emoji: "🎰" },
  // Jackpot
  { id: 23, name: "Jackpot Wheel",      cat: "Jackpot",     provider: "IGT",         badge: "🔥",   bg: "linear-gradient(135deg,#7c3aed,#f59e0b)", emoji: "💰" },
  { id: 24, name: "Mega Fortune",       cat: "Jackpot",     provider: "NetEnt",      badge: "Hot",  bg: "linear-gradient(135deg,#d97706,#16a34a)", emoji: "🤑" },
];

export const CATEGORIES = ["All", "Slots", "Table", "Live Casino", "Jackpot"] as const;
export const PROVIDERS  = ["All Providers", "NetEnt", "Pragmatic", "Evolution", "IGT", "Playson", "EGT", "WMS", "Microgaming"] as const;

/** Provider visual metadata for the provider selector strip. */
export const PROVIDER_META: Record<string, { letter: string; color: string }> = {
  "NetEnt":      { letter: "N", color: "#e11d48" },
  "Pragmatic":   { letter: "P", color: "#f59e0b" },
  "Evolution":   { letter: "E", color: "#7c3aed" },
  "IGT":         { letter: "I", color: "#2563eb" },
  "Playson":     { letter: "P", color: "#059669" },
  "EGT":         { letter: "E", color: "#dc2626" },
  "WMS":         { letter: "W", color: "#0891b2" },
  "Microgaming": { letter: "M", color: "#9333ea" },
};

/** Number of games per provider name. */
export function countByProvider(name: string): number {
  return GAMES.filter((g) => g.provider === name).length;
}

/** First 12 by id — used by the lobby's "Popular Games" strip. */
export const POPULAR_GAMES: Game[] = GAMES.slice(0, 12);
