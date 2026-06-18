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
    bg:           "#0d1b22",
    surface:      "#13232d",
    surface2:     "#1a2e39",
    surface3:     "#203743",
    border:       "rgba(131,163,182,0.12)",
    borderBright: "rgba(131,163,182,0.24)",
    primary:      "#1475e1",
    primaryLight: "#64b2fa",
    secondary:    "#ffa91f",
    text:         "#f7fafc",
    textMuted:    "#9fbed0",
    success:      "#03e625",
    error:        "#ff8391",
    gc:           "#ffa91f",
    sc:           "#1cc1ca",
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
    bg:           "#0a1820",
    surface:      "#122028",
    surface2:     "#192b35",
    surface3:     "#1f3340",
    border:       "rgba(247,147,26,0.12)",
    borderBright: "rgba(247,147,26,0.24)",
    primary:      "#F7931A",
    primaryLight: "#fbbf24",
    secondary:    "#627EEA",
    text:         "#f7fafc",
    textMuted:    "#9fbed0",
    success:      "#03e625",
    error:        "#ff8391",
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
