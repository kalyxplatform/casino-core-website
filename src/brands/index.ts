export type BrandColors = {
  // Surfaces (hex)
  bg:          string;
  surface:     string;
  surface2:    string;
  surface3:    string;
  // Borders (rgba strings — allow tinted borders per brand)
  border:      string;
  borderBright:string;
  // Brand identity (hex)
  primary:     string;
  primaryLight:string;
  secondary:   string;
  // Text (hex)
  text:        string;
  textMuted:   string;
  // Semantic (hex)
  success:     string;
  error:       string;
  // Dual-currency coins (hex)
  gc:          string;
  sc:          string;
};

export type BrandFeatures = {
  showCrypto:     boolean;
  showSweepCoins: boolean;
};

export type BrandConfig = {
  id:           string;
  name:         string;
  logoLetters:  string;
  tagline:      string;
  heroHeadline: string;
  heroSub:      string;
  colors:       BrandColors;
  features:     BrandFeatures;
  meta: { title: string; description: string };
};

// ── SocialSweeps ───────────────────────────────────────────────────────────

const socialSweeps: BrandConfig = {
  id:           "social",
  name:         "SocialSweeps",
  logoLetters:  "SS",
  tagline:      "Play Free. Win Real Prizes.",
  heroHeadline: "Play Free.\nWin Real Prizes.",
  heroSub:      "Thousands of casino games. Daily bonuses. Zero risk — play with virtual coins and redeem Sweep Coins for real prizes.",
  colors: {
    bg:           "#070711",
    surface:      "#0f0f1e",
    surface2:     "#16162a",
    surface3:     "#1e1e38",
    border:       "rgba(255,255,255,0.07)",
    borderBright: "rgba(255,255,255,0.14)",
    primary:      "#7c3aed",
    primaryLight: "#a78bfa",
    secondary:    "#f59e0b",
    text:         "#f1f0fa",
    textMuted:    "#9ca3af",
    success:      "#10b981",
    error:        "#f43f5e",
    gc:           "#f59e0b",
    sc:           "#06b6d4",
  },
  features: {
    showCrypto:     false,
    showSweepCoins: true,
  },
  meta: {
    title:       "SocialSweeps — Free Casino Games & Real Prizes",
    description: "The best social casino. Play free, win Sweep Coins, redeem real prizes.",
  },
};

// ── CryptoCore ─────────────────────────────────────────────────────────────

const cryptoCore: BrandConfig = {
  id:           "crypto",
  name:         "CryptoCore",
  logoLetters:  "CC",
  tagline:      "Casino Gaming Meets Crypto.",
  heroHeadline: "Casino Gaming\nMeets Crypto.",
  heroSub:      "Deposit with Bitcoin, Ethereum, Solana and 8 more chains. Play thousands of games. Withdraw anytime — no banks, no waiting.",
  colors: {
    bg:           "#050508",
    surface:      "#0c0c14",
    surface2:     "#121220",
    surface3:     "#1a1a2c",
    border:       "rgba(247,147,26,0.09)",
    borderBright: "rgba(247,147,26,0.20)",
    primary:      "#F7931A",
    primaryLight: "#fbbf24",
    secondary:    "#627EEA",
    text:         "#f5f4ff",
    textMuted:    "#9ca3af",
    success:      "#10b981",
    error:        "#f43f5e",
    gc:           "#F7931A",
    sc:           "#627EEA",
  },
  features: {
    showCrypto:     true,
    showSweepCoins: false,
  },
  meta: {
    title:       "CryptoCore — Crypto Casino Gaming",
    description: "Deposit with crypto, play casino games, and withdraw instantly. No banks.",
  },
};

export const BRANDS: BrandConfig[] = [socialSweeps, cryptoCore];
export const DEFAULT_BRAND_ID = "social";
