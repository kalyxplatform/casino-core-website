# White-Label Branding Guide

How to create, configure, and deploy a new branded site on the CasinoCore platform.

---

## Table of Contents

1. [How it works](#1-how-it-works)
2. [Add a new brand in 5 minutes](#2-add-a-new-brand-in-5-minutes)
3. [Brand config reference](#3-brand-config-reference)
4. [Color token reference](#4-color-token-reference)
5. [Using the Theme Editor UI](#5-using-the-theme-editor-ui)
6. [Exporting & importing configs](#6-exporting--importing-configs)
7. [Environment-based brand selection](#7-environment-based-brand-selection)
8. [Deploying multiple branded instances](#8-deploying-multiple-branded-instances)
9. [Customising content beyond colors](#9-customising-content-beyond-colors)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. How it works

```
src/brands/index.ts          ← Brand configs live here (one object per brand)
src/context/BrandContext.tsx ← Loads the active brand, writes CSS variables to :root
src/app/globals.css          ← CSS variable names (values injected at runtime)
src/components/admin/ThemeEditor.tsx ← Visual UI to switch brands and edit colors
```

**Runtime flow:**

```
BrandProvider mounts
  → reads localStorage for saved brand + color overrides
  → calls applyBrand(colors) which sets 16 CSS custom properties on document.documentElement
  → any CSS that uses var(--casino-*) updates instantly across the whole site
  → all components call useBrand() to get brand.name, brand.logoLetters, brand.heroHeadline, etc.
```

Because everything goes through CSS variables, switching brands or tweaking a color
re-themes the entire site with zero page reload.

---

## 2. Add a new brand in 5 minutes

**One file to edit:** `src/brands/index.ts`

Copy one of the existing brand objects and fill in your values:

```typescript
const myNewBrand: BrandConfig = {
  id:           "mybrand",              // unique slug, used in localStorage + env var
  name:         "MyBrand Casino",       // shown in header, footer, auth modal
  logoLetters:  "MB",                   // 2 letters shown in the gradient logo square
  tagline:      "Win Big Every Day.",   // shown in footer and hero tag
  heroHeadline: "Win Big\nEvery Day.",  // \n splits into two lines; last line gets gradient
  heroSub:      "Play thousands of free casino games with daily bonuses and no risk.",

  colors: {
    // ── Backgrounds (dark to slightly less dark) ──────────────────────
    bg:           "#060610",   // full page background
    surface:      "#0e0e1c",   // cards, panels
    surface2:     "#141428",   // elevated cards, modals
    surface3:     "#1c1c34",   // active states, hover fills

    // ── Borders (usually rgba so backgrounds show through) ────────────
    border:       "rgba(255,255,255,0.07)",   // subtle dividers
    borderBright: "rgba(255,255,255,0.14)",   // inputs, active outlines

    // ── Brand Identity ─────────────────────────────────────────────────
    primary:      "#e11d48",   // buttons, active states, gradient start
    primaryLight: "#fb7185",   // links, hover text (auto-derived glow uses primary at 28%)
    secondary:    "#f59e0b",   // gradient end, accent, coin highlights

    // ── Text ──────────────────────────────────────────────────────────
    text:         "#f8f8fc",   // headings, body
    textMuted:    "#6b7280",   // labels, captions, placeholders

    // ── Semantic ──────────────────────────────────────────────────────
    success:      "#10b981",
    error:        "#f43f5e",

    // ── Dual-Currency Coins ───────────────────────────────────────────
    gc:           "#f59e0b",   // Gold Coin color (matches secondary here)
    sc:           "#06b6d4",   // Sweep Coin color
  },

  meta: {
    title:       "MyBrand Casino — Free Casino Games",
    description: "Play free, win prizes. No purchase necessary.",
  },
};
```

Then add it to the `BRANDS` array at the bottom of the file:

```typescript
export const BRANDS: BrandConfig[] = [socialSweeps, cryptoCore, myNewBrand];
```

That's it. The brand immediately appears in the Theme Editor's brand switcher.

---

## 3. Brand config reference

```typescript
type BrandConfig = {
  id:           string;   // URL-safe slug. Used for localStorage key + NEXT_PUBLIC_BRAND env var.
  name:         string;   // Full display name shown everywhere in the UI.
  logoLetters:  string;   // 2-character abbreviation shown in the gradient logo square.
  tagline:      string;   // Short marketing line (footer, meta description).
  heroHeadline: string;   // Homepage H1. Use \n to force a line break.
                          // The LAST line automatically gets the primary→secondary gradient.
  heroSub:      string;   // Homepage subtitle paragraph under the H1.
  colors:       BrandColors;  // See section 4.
  meta: {
    title:       string; // <title> tag value.
    description: string; // <meta name="description"> value.
  };
};
```

### Notes

- `id` must be unique across all brands in the array.
- `logoLetters` renders inside a 30×30 gradient square. Two characters work best.
- `heroHeadline` split on `\n` — each segment renders on its own line, the last one
  gets `background-clip: text` with the primary→secondary gradient.

---

## 4. Color token reference

| Token | CSS variable | Controls | Format |
|---|---|---|---|
| `bg` | `--casino-bg` | Full page background | hex |
| `surface` | `--casino-surface` | Card / panel backgrounds | hex |
| `surface2` | `--casino-surface-2` | Elevated surfaces, modals | hex |
| `surface3` | `--casino-surface-3` | Active / hover fills, sidebars | hex |
| `border` | `--casino-border` | Subtle dividers, table rows | rgba string |
| `borderBright` | `--casino-border-bright` | Input borders, active outlines | rgba string |
| `primary` | `--casino-purple` | Buttons, active tabs, gradient start | hex |
| `primaryLight` | `--casino-purple-light` | Link text, hint text | hex |
| *(auto)* | `--casino-purple-soft` | Subtle tinted backgrounds (pills, callouts) | auto-derived: `primary` at 15% |
| *(auto)* | `--casino-purple-bright` | Tinted borders, active outlines | auto-derived: `primary` at 35% |
| *(auto)* | `--casino-purple-glow` | Box shadow glow on primary elements | auto-derived: `primary` at 28% |
| `secondary` | `--casino-gold` | Gradient end, gold coin, accent | hex |
| *(auto)* | `--casino-gold-soft` | Subtle gold-tinted backgrounds | auto-derived: `secondary` at 10% |
| *(auto)* | `--casino-gold-bright` | Gold-tinted borders | auto-derived: `secondary` at 30% |
| *(auto)* | `--casino-gold-glow` | Box shadow glow on secondary elements | auto-derived: `secondary` at 25% |
| `text` | `--casino-text` | Headings and body copy | hex |
| `textMuted` | `--casino-text-muted` | Labels, captions, placeholder | hex |
| `success` | `--casino-success` | Confirmed states, verified badges | hex |
| `error` | `--casino-error` | Error messages, destructive buttons | hex |
| `gc` | `--casino-gc` | Gold Coin currency display | hex |
| `sc` | `--casino-sc` | Sweep Coin currency display | hex |

**Glow values are auto-derived** from `primary` and `secondary` in `BrandContext.tsx`:

```typescript
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
// primaryGlow  = hexToRgba(primary,  0.28)
// secondaryGlow = hexToRgba(secondary, 0.25)
```

You never need to set glow values manually — change `primary` or `secondary` and the glows follow.

### Tinted borders (crypto brand pattern)

For a crypto brand, you might want borders that reflect the primary brand color
instead of neutral white. Use rgba with your primary color:

```typescript
border:       "rgba(247,147,26,0.09)",   // orange-tinted (Bitcoin brand)
borderBright: "rgba(247,147,26,0.20)",
```

For a neutral social casino, white-tinted borders look cleaner:

```typescript
border:       "rgba(255,255,255,0.07)",
borderBright: "rgba(255,255,255,0.14)",
```

---

## 5. Using the Theme Editor UI

Access the editor by clicking the **🎨 button** (bottom-right corner of the site).
It's always available in all environments.

### Brand switcher

The top section shows a card for each brand in `BRANDS`.
Click a card to instantly switch to that brand — all colors, name, tagline, and hero copy update in real time.

### Color editor

Six grouped sections cover all 16 tokens:

- **Brand Identity** — Primary, Primary Light, Secondary
- **Backgrounds** — bg, surface, surface2, surface3
- **Borders** — border, borderBright *(text inputs, because they're rgba)*
- **Text** — text, textMuted
- **Coins** — gc, sc
- **Semantic** — success, error

For hex tokens: click the **color swatch** to open the OS native color picker.  
For rgba tokens: edit the **text input** directly (e.g. `rgba(255,255,255,0.12)`).

Every change applies immediately to the live page.

### Live preview pill

At the bottom of the editor, a small preview card shows the current brand logo,
name, and tagline using the current colors — useful for a quick sanity check.

### Reset vs Export

| Action | What it does |
|---|---|
| **Reset Colors** | Discards all color overrides. Reverts to the selected brand's defaults in `brands/index.ts`. |
| **Export Config** | Copies a JSON object to clipboard containing `{ id, overrides }`. Use this to lock in a custom palette. |

---

## 6. Exporting & importing configs

### Export from the editor

Click **Export Config** in the Theme Editor. You get:

```json
{
  "id": "social",
  "overrides": {
    "primary": "#e11d48",
    "secondary": "#7c3aed"
  }
}
```

Only tokens you've changed appear in `overrides`. The rest inherit from the brand defaults.

### Import / seed in code

To hard-code a specific palette for a deployment, pre-seed `localStorage` in a
`<script>` tag in your HTML shell, or inject it from a server-side cookie:

```typescript
// e.g. in a layout-level useEffect or middleware
localStorage.setItem("ccore_brand_v1", JSON.stringify({
  id: "social",
  overrides: {
    primary: "#e11d48",
    secondary: "#7c3aed",
  },
}));
```

Or for a fully static brand with no runtime switching, just update the brand object
in `src/brands/index.ts` and set `DEFAULT_BRAND_ID` to your brand's `id`.

---

## 7. Environment-based brand selection

For separate deployments where the brand should be baked in at build time,
read the brand from an environment variable and write it into the initial
`localStorage` value before the app hydrates.

### Step 1 — Add the env var

```bash
# .env.local (SocialSweeps deployment)
NEXT_PUBLIC_BRAND=social

# .env.local (CryptoCore deployment)
NEXT_PUBLIC_BRAND=crypto
```

### Step 2 — Seed localStorage before hydration

Create `src/app/brand-seed.tsx` (client component):

```tsx
"use client";
import { useEffect } from "react";

export default function BrandSeed() {
  useEffect(() => {
    const envBrand = process.env.NEXT_PUBLIC_BRAND;
    if (!envBrand) return;
    const existing = localStorage.getItem("ccore_brand_v1");
    if (!existing) {
      // Only seed if user has no saved preference
      localStorage.setItem("ccore_brand_v1", JSON.stringify({ id: envBrand, overrides: {} }));
    }
  }, []);
  return null;
}
```

Add `<BrandSeed />` inside `<BrandProvider>` in `src/app/layout.tsx`.

### Step 3 — Lock the default for production

In `src/brands/index.ts`:

```typescript
export const DEFAULT_BRAND_ID =
  process.env.NEXT_PUBLIC_BRAND ?? "social";
```

This ensures SSR renders the correct brand without waiting for `localStorage`.

---

## 8. Deploying multiple branded instances

### Pattern A — Single codebase, runtime switching (default)

Best for internal admin, demos, A/B testing.

- One Next.js deployment.
- Users or admins switch brands via the Theme Editor.
- No additional infrastructure needed.

### Pattern B — One deployment per brand (recommended for production)

Best for separate customer-facing domains (e.g. `socialSweeps.com` vs `cryptocore.io`).

```
Vercel / Docker project "socialSweeps"
  NEXT_PUBLIC_BRAND=social
  domain: socialSweeps.com

Vercel / Docker project "cryptocore"
  NEXT_PUBLIC_BRAND=crypto
  domain: cryptocore.io
```

Both deployments come from the **same repository** — only the env var differs.
The Theme Editor can be disabled in production by wrapping `<ThemeEditor />` in
a check:

```tsx
// layout.tsx
{process.env.NODE_ENV !== "production" && <ThemeEditor />}
// or
{process.env.NEXT_PUBLIC_ENABLE_THEME_EDITOR === "true" && <ThemeEditor />}
```

### Pattern C — Subdomain routing (advanced)

Handle subdomain detection in Next.js middleware:

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const brand = host.startsWith("crypto") ? "crypto" : "social";
  const res = NextResponse.next();
  res.headers.set("x-brand", brand);
  return res;
}
```

Then read `x-brand` in your root layout to seed BrandProvider server-side.

---

## 9. Customising content beyond colors

### Hero copy

Edit `heroHeadline` and `heroSub` in the brand config.  
Use `\n` in `heroHeadline` to force a line break between words — the last segment
receives the gradient automatically.

```typescript
heroHeadline: "Win Big\nEvery Day.",
// Renders as:
//   Win Big          ← plain white
//   Every Day.       ← primary→secondary gradient
```

### Page metadata (SEO)

```typescript
meta: {
  title:       "MyBrand — Free Casino Games",
  description: "Play free, win prizes.",
},
```

To make these dynamic (applied at build time per brand), update `layout.tsx`:

```typescript
// layout.tsx — server component, can read from env
import { BRANDS, DEFAULT_BRAND_ID } from "@/brands";

const activeBrand = BRANDS.find((b) => b.id === (process.env.NEXT_PUBLIC_BRAND ?? DEFAULT_BRAND_ID))!;

export const metadata: Metadata = {
  title:       activeBrand.meta.title,
  description: activeBrand.meta.description,
};
```

### Feature flags per brand

`BrandConfig.features` already drives brand-conditional UI. Current flags:

```typescript
type BrandFeatures = {
  showCrypto:     boolean;  // show 🪙 Crypto nav link, /crypto page, crypto deposit flows
  showSweepCoins: boolean;  // show SC balance pill and redemption flows
};
```

Wired:
- `src/components/layout/Header.tsx` — hides the `🪙 Crypto` desktop nav link when `showCrypto` is false
- `src/components/layout/MobileNav.tsx` — adds the `Crypto` bottom-nav item only when `showCrypto` is true
- `src/app/crypto/page.tsx` — shows a "Not available on {brand.name}" placeholder when `showCrypto` is false instead of rendering the crypto landing page

To add a new flag, extend the type, set both brand objects, and gate components with `useBrand()`:

```tsx
const { brand } = useBrand();
if (!brand.features.showCrypto) return null;
```

---

## 10. Switching auth between mock and real API

The auth implementation lives behind a single interface in `src/lib/api/auth.ts`.
Two implementations ship:

| `NEXT_PUBLIC_AUTH_API` | Implementation | When to use |
|---|---|---|
| *(unset)* or `mock` | `MockAuthApi` — fake delays, fake user | Local dev, demos, design QA |
| `http` | `HttpAuthApi` — POSTs to `NEXT_PUBLIC_API_URL` | Staging, production |

```bash
# .env.local for real backend
NEXT_PUBLIC_AUTH_API=http
NEXT_PUBLIC_API_URL=https://api.casinocore.dev
```

`AuthContext` calls `createAuthApi()` once on mount, then every `login()`/`register()`
call goes through the interface. To add another route (`forgotPassword`, `verify2fa`,
etc.) extend the `AuthApi` interface and add a matching method on both implementations.

---

## 11. Troubleshooting

### Colors aren't updating after I changed `brands/index.ts`

The browser has a saved config in `localStorage` under key `ccore_brand_v1`.
Clear it: open DevTools → Application → Local Storage → delete `ccore_brand_v1` → refresh.

Or force-reset programmatically:
```javascript
localStorage.removeItem("ccore_brand_v1"); location.reload();
```

### Flash of wrong brand on first load (FOUB)

This is now handled automatically. `layout.tsx` calls `getActiveBrand()` (from
`src/lib/brand-ssr.ts`) which reads `NEXT_PUBLIC_BRAND`, and inlines the full
brand CSS variables into `<head>` on the server. SSR HTML paints with the
correct brand colors immediately — no flash.

The only residual flash case is when a user has previously saved a *different*
brand in `localStorage` via the Theme Editor. `BrandProvider`'s `useEffect`
will then swap to the saved brand after hydration. For per-deployment brands
where users shouldn't be switching, gate the Theme Editor with
`NEXT_PUBLIC_ENABLE_THEME_EDITOR`.

### Theme Editor not appearing

The 🎨 button is a fixed-position element. Check for `z-index` conflicts in
custom CSS. It renders at `z-index: 50`. The drawer renders at `z-index: 50` too.

To confirm it's mounted, check React DevTools for `ThemeEditor` in the component tree.

### `useBrand()` throws "must be inside BrandProvider"

A component is calling `useBrand()` but renders outside `<BrandProvider>`.  
`BrandProvider` must wrap your entire component tree — it lives in `src/app/layout.tsx`
and wraps `<AuthProvider>` and everything else.

### Color picker doesn't open (rgba tokens)

The rgba tokens (`border`, `borderBright`) use text inputs, not color pickers,
because the native `<input type="color">` does not support alpha channels.
Edit the text input directly: `rgba(255,255,255,0.12)`.

---

## Quick reference card

```
Add a brand     → src/brands/index.ts — add BrandConfig object + push to BRANDS array
Switch brand    → Theme Editor 🎨 → Brand card, or set NEXT_PUBLIC_BRAND env var
Edit colors     → Theme Editor 🎨 → Color token sections, or edit brand object directly
Save palette    → Theme Editor 🎨 → Export Config → paste JSON into deployment seed
Default brand   → src/brands/index.ts → DEFAULT_BRAND_ID constant
CSS variables   → all named --casino-* in globals.css; values injected by BrandProvider
Hook            → const { brand, setBrandId, updateColor } = useBrand();
Storage key     → localStorage "ccore_brand_v1" → { id: string, overrides: Partial<BrandColors> }
```
