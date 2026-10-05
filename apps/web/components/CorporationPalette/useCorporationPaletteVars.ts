"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useMantineTheme } from "@mantine/core";

import {
  getCorporationPaletteWash,
  tickerNeedsEdge,
} from "./corporationPalette";

/**
 * CSS variables for a corporation's palette wash and ticker edge, computed
 * against the current theme's card surface in both colour schemes (Mantine's
 * Card is `white` in light and `dark[6]` in dark). Spread the result onto an
 * element that contains both the wash and the ticker badge.
 */
export const useCorporationPaletteVars = (
  colors: readonly string[],
): CSSProperties => {
  const theme = useMantineTheme();
  const light = theme.white;
  const dark = theme.colors.dark[6];
  const key = colors.join(",");

  return useMemo(() => {
    const palette = key ? key.split(",") : [];
    if (palette.length === 0) return {};
    const edge = (surface: string, border: string) =>
      tickerNeedsEdge(palette, surface) ? `0 0 0 1px ${border}` : "none";
    return {
      "--corp-wash-light": getCorporationPaletteWash(palette, light),
      "--corp-wash-dark": getCorporationPaletteWash(palette, dark),
      "--corp-ticker-edge-light": edge(light, "var(--mantine-color-gray-3)"),
      "--corp-ticker-edge-dark": edge(dark, "var(--mantine-color-dark-4)"),
    } as CSSProperties;
  }, [key, light, dark]);
};
