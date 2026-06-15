export type VipTier = {
  name:            "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  /** Player level range (inclusive). */
  min:             number;
  max:             number;
  /** Display string for the level range, e.g. "1–3". */
  levels:          string;
  color:           string;
  glow:            string;
  emoji:           string;
  cashback:        string;
  weeklyBonus:     string;
  monthlyBonus:    string;
  supportPriority: string;
  customLimits:    boolean;
  exclusiveGames:  boolean;
  dedicatedHost:   boolean;
  xpRequired:      string;
  popular?:        boolean;
};

export const VIP_TIERS: VipTier[] = [
  {
    name: "Bronze",
    min: 1,  max: 3,  levels: "1–3",
    color: "#b45309",  glow: "rgba(180,83,9,.2)",
    emoji: "🥉",
    cashback: "0%",  weeklyBonus: "—",         monthlyBonus: "—",
    supportPriority: "Standard",
    customLimits: false, exclusiveGames: false, dedicatedHost: false,
    xpRequired: "0 XP",
  },
  {
    name: "Silver",
    min: 4,  max: 6,  levels: "4–6",
    color: "#9ca3af",  glow: "rgba(156,163,175,.2)",
    emoji: "🥈",
    cashback: "5%",  weeklyBonus: "Up to 10K GC", monthlyBonus: "—",
    supportPriority: "Priority",
    customLimits: false, exclusiveGames: false, dedicatedHost: false,
    xpRequired: "3,000 XP",
  },
  {
    name: "Gold",
    min: 7,  max: 10, levels: "7–10",
    color: "#f59e0b",  glow: "rgba(245,158,11,.25)",
    emoji: "🥇",
    cashback: "10%", weeklyBonus: "Up to 50K GC", monthlyBonus: "100K GC",
    supportPriority: "Priority",
    customLimits: false, exclusiveGames: true, dedicatedHost: false,
    xpRequired: "10,000 XP",
    popular: true,
  },
  {
    name: "Platinum",
    min: 11, max: 15, levels: "11–15",
    color: "#06b6d4",  glow: "rgba(6,182,212,.2)",
    emoji: "💎",
    cashback: "15%", weeklyBonus: "Up to 200K GC", monthlyBonus: "500K GC",
    supportPriority: "VIP Line",
    customLimits: true, exclusiveGames: true, dedicatedHost: false,
    xpRequired: "30,000 XP",
  },
  {
    name: "Diamond",
    min: 16, max: 20, levels: "16–20",
    color: "#a78bfa",  glow: "rgba(167,139,250,.25)",
    emoji: "👑",
    cashback: "20%", weeklyBonus: "Up to 500K GC", monthlyBonus: "2M GC",
    supportPriority: "Dedicated Host",
    customLimits: true, exclusiveGames: true, dedicatedHost: true,
    xpRequired: "100,000 XP",
  },
];

/** Tier containing the given level, falling back to Bronze. */
export function tierForLevel(level: number): VipTier {
  return VIP_TIERS.find((t) => level >= t.min && level <= t.max) ?? VIP_TIERS[0];
}
