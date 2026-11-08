import type { CSSProperties } from "react";

/**
 * The wash and the ticker edge depend on the card surface, which differs per
 * colour scheme (and per app theme), so `useCorporationPaletteVars` computes
 * both schemes and `light-dark()` picks one. Choosing in CSS rather than in
 * render keeps the server and client markup identical.
 *
 * Inline styles rather than a CSS module, so the packages that render these
 * need no CSS-module support in their bundler, tests or type-check.
 */
export const corporationPaletteStyles = {
  /** Tints a surface with the corporation's colours. */
  wash: {
    background:
      "light-dark(var(--corp-wash-light, transparent), var(--corp-wash-dark, transparent))",
  },
  /** A hairline around the ticker where its fill is too close to the surface. */
  tickerEdge: {
    boxShadow:
      "light-dark(var(--corp-ticker-edge-light, none), var(--corp-ticker-edge-dark, none))",
  },
  /** Transparent logos would otherwise show the wash through them. */
  logoBacking: {
    backgroundColor:
      "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
  },
} satisfies Record<string, CSSProperties>;
