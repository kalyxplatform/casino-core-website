"use client";

import {
  createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode,
} from "react";
import { BRANDS, BrandConfig, BrandColors } from "@/brands";
import { getActiveBrand } from "@/lib/brand-ssr";
import { hexToRgba } from "@/lib/color";

type BrandContextValue = {
  brand:        BrandConfig;
  brands:       BrandConfig[];
  setBrandId:   (id: string) => void;
  updateColor:  (token: keyof BrandColors, value: string) => void;
  resetColors:  () => void;
  exportConfig: () => string;
};

const BrandCtx = createContext<BrandContextValue | null>(null);
const STORAGE_KEY = "ccore_brand_v1";

// ── CSS variable mapping ───────────────────────────────────────────────────

function applyBrand(colors: BrandColors) {
  const s = document.documentElement.style;
  s.setProperty("--casino-bg",            colors.bg);
  s.setProperty("--casino-surface",       colors.surface);
  s.setProperty("--casino-surface-2",     colors.surface2);
  s.setProperty("--casino-surface-3",     colors.surface3);
  s.setProperty("--casino-border",        colors.border);
  s.setProperty("--casino-border-bright", colors.borderBright);
  s.setProperty("--casino-purple",        colors.primary);
  s.setProperty("--casino-purple-light",  colors.primaryLight);
  s.setProperty("--casino-purple-soft",   hexToRgba(colors.primary, 0.10));
  s.setProperty("--casino-purple-bright", hexToRgba(colors.primary, 0.24));
  s.setProperty("--casino-purple-glow",   hexToRgba(colors.primary, 0.18));
  s.setProperty("--casino-gold",          colors.secondary);
  s.setProperty("--casino-gold-soft",     hexToRgba(colors.secondary, 0.10));
  s.setProperty("--casino-gold-bright",   hexToRgba(colors.secondary, 0.28));
  s.setProperty("--casino-gold-glow",     hexToRgba(colors.secondary, 0.20));
  s.setProperty("--casino-text",          colors.text);
  s.setProperty("--casino-text-muted",    colors.textMuted);
  s.setProperty("--casino-success",       colors.success);
  s.setProperty("--casino-error",         colors.error);
  s.setProperty("--casino-gc",            colors.gc);
  s.setProperty("--casino-sc",            colors.sc);
}

// ── provider ───────────────────────────────────────────────────────────────

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandId,        setBrandIdState]  = useState(() => getActiveBrand().id);
  const [colorOverrides, setColorOverrides]= useState<Partial<BrandColors>>({});

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { id, overrides } = JSON.parse(raw) as { id?: string; overrides?: Partial<BrandColors> };
      if (id && BRANDS.find((b) => b.id === id)) setBrandIdState(id);
      if (overrides && typeof overrides === "object") setColorOverrides(overrides);
    } catch {}
  }, []);

  const brand = useMemo<BrandConfig>(() => {
    const baseBrand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];
    return {
      ...baseBrand,
      colors: { ...baseBrand.colors, ...colorOverrides },
    };
  }, [brandId, colorOverrides]);

  // Apply CSS variables whenever brand identity changes
  useEffect(() => { applyBrand(brand.colors); }, [brand]);

  function persist(id: string, overrides: Partial<BrandColors>) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, overrides })); } catch {}
  }

  const setBrandId = useCallback((id: string) => {
    setBrandIdState(id);
    setColorOverrides({});
    persist(id, {});
  }, []);

  const updateColor = useCallback((token: keyof BrandColors, value: string) => {
    setColorOverrides((prev) => {
      const next = { ...prev, [token]: value };
      persist(brandId, next);
      return next;
    });
  }, [brandId]);

  const resetColors = useCallback(() => {
    setColorOverrides({});
    persist(brandId, {});
  }, [brandId]);

  const exportConfig = useCallback(() => {
    return JSON.stringify({ id: brandId, overrides: colorOverrides }, null, 2);
  }, [brandId, colorOverrides]);

  const value = useMemo(() => ({
    brand, brands: BRANDS, setBrandId, updateColor, resetColors, exportConfig,
  }), [brand, setBrandId, updateColor, resetColors, exportConfig]);

  return <BrandCtx.Provider value={value}>{children}</BrandCtx.Provider>;
}

export function useBrand() {
  const ctx = useContext(BrandCtx);
  if (!ctx) throw new Error("useBrand must be inside BrandProvider");
  return ctx;
}
