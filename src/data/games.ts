export type GameBadge = "Hot" | "New" | "Top" | "Live" | "🔥";

export type Game = {
  id:       number;
  name:     string;
  cat:      "Slots" | "Table" | "Live Casino" | "Jackpot" | "Burst" | "Originals";
  provider: string;
  badge:    GameBadge | null;
  bg:       string;
  emoji:    string;
};

export const GAMES: Game[] = [
  // Slots
  { id: 1,  name: "Starburst Wilds",    cat: "Slots",      provider: "NetEnt",      badge: "Hot",  bg: "#92400e", emoji: "⭐"  },
  { id: 2,  name: "Dragon's Fortune",   cat: "Slots",      provider: "Pragmatic",   badge: "New",  bg: "#1e1b4b", emoji: "🐉" },
  { id: 3,  name: "Book of Gold",       cat: "Slots",      provider: "Playson",     badge: null,   bg: "#78350f", emoji: "📖" },
  { id: 4,  name: "Neon City 3000",     cat: "Slots",      provider: "NetEnt",      badge: "Hot",  bg: "#0e7490", emoji: "🌆" },
  { id: 5,  name: "Lucky Shamrock",     cat: "Slots",      provider: "EGT",         badge: null,   bg: "#065f46", emoji: "🍀" },
  { id: 6,  name: "Diamond Rush",       cat: "Slots",      provider: "IGT",         badge: "Top",  bg: "#1e3a8a", emoji: "💎" },
  { id: 7,  name: "Space Spins",        cat: "Slots",      provider: "Pragmatic",   badge: "New",  bg: "#1e1b4b", emoji: "🚀" },
  { id: 8,  name: "Aztec Gold",         cat: "Slots",      provider: "Playson",     badge: null,   bg: "#78350f", emoji: "🏺" },
  { id: 9,  name: "Wild West Cash",     cat: "Slots",      provider: "WMS",         badge: null,   bg: "#451a03", emoji: "🤠" },
  { id: 10, name: "Candy Kingdom",      cat: "Slots",      provider: "NetEnt",      badge: "Hot",  bg: "#831843", emoji: "🍭" },
  { id: 11, name: "Ocean Depths",       cat: "Slots",      provider: "IGT",         badge: null,   bg: "#082f49", emoji: "🐬" },
  { id: 12, name: "Ninja Fortune",      cat: "Slots",      provider: "Pragmatic",   badge: "New",  bg: "#1a1a2e", emoji: "🥷" },
  { id: 13, name: "Viking Raid",        cat: "Slots",      provider: "EGT",         badge: null,   bg: "#1f2937", emoji: "⚔️" },
  { id: 14, name: "Treasure Island",    cat: "Slots",      provider: "Playson",     badge: "Hot",  bg: "#0c4a6e", emoji: "🏝️" },
  { id: 15, name: "Fire Phoenix",       cat: "Slots",      provider: "WMS",         badge: null,   bg: "#7f1d1d", emoji: "🔥" },
  { id: 16, name: "Egyptian Riches",    cat: "Slots",      provider: "IGT",         badge: null,   bg: "#713f12", emoji: "🐫" },
  // Table
  { id: 17, name: "Blackjack Pro",      cat: "Table",      provider: "Evolution",   badge: null,   bg: "#1e2a38", emoji: "🃏" },
  { id: 18, name: "Poker Legends",      cat: "Table",      provider: "Microgaming", badge: null,   bg: "#134e4a", emoji: "♠️" },
  { id: 19, name: "Baccarat Elite",     cat: "Table",      provider: "Evolution",   badge: null,   bg: "#1e1b4b", emoji: "🎴" },
  { id: 20, name: "American Roulette",  cat: "Table",      provider: "Pragmatic",   badge: null,   bg: "#1e3a5f", emoji: "🎯" },
  // Live Casino
  { id: 21, name: "Live Roulette",      cat: "Live Casino",provider: "Evolution",   badge: "Live", bg: "#7f1d1d", emoji: "🎡" },
  { id: 22, name: "Live Baccarat VIP",  cat: "Live Casino",provider: "Evolution",   badge: "Live", bg: "#1e1b4b", emoji: "🎰" },
  { id: 23, name: "Live Blackjack",     cat: "Live Casino",provider: "Evolution",   badge: "Live", bg: "#134e4a", emoji: "🃏" },
  { id: 24, name: "Lightning Roulette", cat: "Live Casino",provider: "Evolution",   badge: "Hot",  bg: "#451a03", emoji: "⚡" },
  { id: 25, name: "Crazy Time",         cat: "Live Casino",provider: "Evolution",   badge: "Hot",  bg: "#4c1d95", emoji: "🎪" },
  { id: 26, name: "Dream Catcher",      cat: "Live Casino",provider: "Evolution",   badge: "Live", bg: "#083344", emoji: "💫" },
  // Jackpot
  { id: 27, name: "Jackpot Wheel",      cat: "Jackpot",    provider: "IGT",         badge: "🔥",   bg: "#4c1d95", emoji: "💰" },
  { id: 28, name: "Mega Fortune",       cat: "Jackpot",    provider: "NetEnt",      badge: "Hot",  bg: "#78350f", emoji: "🤑" },
  // Burst
  { id: 29, name: "Burst Blitz",        cat: "Burst",      provider: "Pragmatic",   badge: "New",  bg: "#7f1d1d", emoji: "💥" },
  { id: 30, name: "Speed Crash",        cat: "Burst",      provider: "NetEnt",      badge: "Hot",  bg: "#1e1b4b", emoji: "⚡" },
  { id: 31, name: "Rocket Launch",      cat: "Burst",      provider: "Hacksaw",     badge: "New",  bg: "#0c4a6e", emoji: "🚀" },
  { id: 32, name: "Turbo Mines",        cat: "Burst",      provider: "Pragmatic",   badge: null,   bg: "#065f46", emoji: "💣" },
  { id: 33, name: "Plinko Pro",         cat: "Burst",      provider: "Hacksaw",     badge: "Hot",  bg: "#4c1d95", emoji: "🎰" },
  { id: 34, name: "Limbo",              cat: "Burst",      provider: "Hacksaw",     badge: null,   bg: "#1e3a8a", emoji: "🎲" },
  { id: 35, name: "Crash Party",        cat: "Burst",      provider: "NetEnt",      badge: "New",  bg: "#831843", emoji: "🎉" },
  { id: 36, name: "Hilo Xtreme",        cat: "Burst",      provider: "Pragmatic",   badge: null,   bg: "#134e4a", emoji: "🃏" },
  // Originals
  { id: 37, name: "Golden Lobby",       cat: "Originals",  provider: "In-House",    badge: "New",  bg: "#92400e", emoji: "🏆" },
  { id: 38, name: "Lobby Dice",         cat: "Originals",  provider: "In-House",    badge: null,   bg: "#1e3a8a", emoji: "🎲" },
  { id: 39, name: "Wheel of Fortune",   cat: "Originals",  provider: "In-House",    badge: "Hot",  bg: "#4c1d95", emoji: "🎡" },
  { id: 40, name: "Keno Royale",        cat: "Originals",  provider: "In-House",    badge: null,   bg: "#065f46", emoji: "🎯" },
  { id: 41, name: "Flip or Rip",        cat: "Originals",  provider: "In-House",    badge: "New",  bg: "#7f1d1d", emoji: "🪙" },
  { id: 42, name: "Tower Climb",        cat: "Originals",  provider: "In-House",    badge: null,   bg: "#082f49", emoji: "🗼" },
  { id: 43, name: "Mine Sweeper Gold",  cat: "Originals",  provider: "In-House",    badge: "Hot",  bg: "#451a03", emoji: "💣" },
  { id: 44, name: "Pump It",            cat: "Originals",  provider: "In-House",    badge: "New",  bg: "#1a1a2e", emoji: "🎈" },
];

export const CATEGORIES = ["All", "Slots", "Table", "Live Casino", "Jackpot", "Burst", "Originals"] as const;
export const PROVIDERS  = ["All Providers", "NetEnt", "Pragmatic", "Evolution", "IGT", "Playson", "EGT", "WMS", "Microgaming", "Hacksaw"] as const;

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
  "Hacksaw":     { letter: "H", color: "#ea580c" },
  "In-House":    { letter: "★", color: "#d97706" },
};

/** Number of games per provider name. */
export function countByProvider(name: string): number {
  return GAMES.filter((g) => g.provider === name).length;
}

/** First 12 by id — used by the lobby's "Popular Games" strip. */
export const POPULAR_GAMES: Game[] = GAMES.slice(0, 12);
