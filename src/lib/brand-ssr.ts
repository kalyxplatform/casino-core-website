import { BRANDS, BrandConfig, BrandColors, DEFAULT_BRAND_ID } from "@/brands";
import { hexToRgba } from "@/lib/color";

/**
 * Resolves the build-time active brand from NEXT_PUBLIC_BRAND.
 * Used by layout.tsx for per-brand metadata and the inline CSS-vars in <head>,
 * and by BrandContext as the initial state on first render.
 */
export function getActiveBrand(): BrandConfig {
  const id = process.env.NEXT_PUBLIC_BRAND ?? DEFAULT_BRAND_ID;
  return BRANDS.find((b) => b.id === id) ?? BRANDS[0];
}

/**
 * Renders the active brand's CSS variables as a `:root { … }` block.
 * Inlined in <head> so the first paint matches the active brand instead of
 * showing the globals.css defaults until BrandProvider's useEffect runs.
 */
export function brandCssVars(colors: BrandColors): string {
  return `:root{`
    + `--casino-bg:${colors.bg};`
    + `--casino-surface:${colors.surface};`
    + `--casino-surface-2:${colors.surface2};`
    + `--casino-surface-3:${colors.surface3};`
    + `--casino-border:${colors.border};`
    + `--casino-border-bright:${colors.borderBright};`
    + `--casino-purple:${colors.primary};`
    + `--casino-purple-light:${colors.primaryLight};`
    + `--casino-purple-soft:${hexToRgba(colors.primary, 0.15)};`
    + `--casino-purple-bright:${hexToRgba(colors.primary, 0.35)};`
    + `--casino-purple-glow:${hexToRgba(colors.primary, 0.28)};`
    + `--casino-gold:${colors.secondary};`
    + `--casino-gold-soft:${hexToRgba(colors.secondary, 0.10)};`
    + `--casino-gold-bright:${hexToRgba(colors.secondary, 0.30)};`
    + `--casino-gold-glow:${hexToRgba(colors.secondary, 0.25)};`
    + `--casino-text:${colors.text};`
    + `--casino-text-muted:${colors.textMuted};`
    + `--casino-success:${colors.success};`
    + `--casino-error:${colors.error};`
    + `--casino-gc:${colors.gc};`
    + `--casino-sc:${colors.sc};`
    + `}`;
}
