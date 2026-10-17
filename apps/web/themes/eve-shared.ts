import type { MantineColorsTuple } from "@mantine/core";
import { createTheme } from "@mantine/core";

/**
 * What the EVE theme (./eve.ts) and EVE (old) (./eve-old.ts) share: the
 * fonts, type scale, spacing, breakpoints, accent palettes and the design
 * tokens neither changed. Each theme spreads these into its own
 * `createTheme`, and keeps its own greys, primary, radii, shadows and
 * component styles.
 */

export const rem = (px: number): string => `${px / 16}rem`;

// Font stacks. The `--font-*` variables come from next/font (app/fonts.ts, set
// on <html> by the root layout). Their fallback is the plain family name, so
// the stack stays valid — and a locally installed copy still applies — where
// the variable is unset: a `var()` with no fallback that fails to resolve
// invalidates the whole `font-family` declaration, not just its first entry.
export const displayFont =
  'var(--font-rajdhani, "Rajdhani"), "Inter", "Segoe UI", sans-serif';
export const monoFont =
  'var(--font-jetbrains-mono, "JetBrains Mono"), "SFMono-Regular", ui-monospace, monospace';

/* ---- Accent palettes (index 0 = lightest … 9 = darkest) ------- */

// EVE accent — amber / gold. Reserved for key figures & badges.
const gold: MantineColorsTuple = [
  "#f7f2df",
  "#ecdfb8",
  "#dec58c",
  "#d0ac61",
  "#c5983d",
  "#be8e28",
  "#b9891c",
  "#a4780d",
  "#906806",
  "#7b5700",
];

// Caldari — the Jita home-state signal blue (links, active states).
const caldari: MantineColorsTuple = [
  "#e0f4fa",
  "#c6ebf4",
  "#9fdcec",
  "#74cbe1",
  "#64b9d2",
  "#4eb0cc",
  "#3fa9ca", // Caldari signature blue
  "#2c93b3",
  "#157f9f",
  "#00738f",
];

// Caldari teal — secondary signal.
const teal: MantineColorsTuple = [
  "#dcf6f3",
  "#c0efea",
  "#94e3db",
  "#67d6cc",
  "#54cdc2",
  "#48c8bc",
  "#43c5bd", // Caldari teal
  "#2faaa3",
  "#1b9690",
  "#008780",
];

// Faction status greens (Gallente) & reds (Minmatar) for standings.
const green: MantineColorsTuple = [
  "#e3f6ee",
  "#caeede",
  "#9adcc1",
  "#67caa3",
  "#4bbb94", // status-positive
  "#34b186",
  "#23ac7d",
  "#11966b",
  "#00855d",
  "#00734e",
];

const rust: MantineColorsTuple = [
  "#fbeae5",
  "#f3cfc4",
  "#e6a892",
  "#da8061",
  "#cf5a39", // status-negative / Minmatar
  "#c84a28",
  "#c5421f",
  "#ad3414",
  "#9b2c0e",
  "#882205",
];

export const eveAccentColors = { gold, caldari, teal, green, rust };

/** Fonts, type scale, spacing, breakpoints and interaction defaults. */
export const eveFoundations = createTheme({
  /* Type — Rajdhani everywhere, JetBrains Mono for numerics/code */
  fontFamily: displayFont,
  fontFamilyMonospace: monoFont,

  fontSizes: {
    xs: rem(12),
    sm: rem(14),
    md: rem(16),
    lg: rem(18),
    xl: rem(22),
  },

  lineHeights: {
    xs: "1.1",
    sm: "1.2",
    md: "1.55",
    lg: "1.55",
    xl: "1.55",
  },

  /* Spacing — tight technical rhythm */
  spacing: {
    xs: rem(8),
    sm: rem(10),
    md: rem(14),
    lg: rem(20),
    xl: rem(28),
  },

  /* Breakpoints / containers */
  breakpoints: {
    xs: "36em",
    sm: "48em",
    md: "64em",
    lg: "80em", // 1280px container-xl
    xl: "90em",
  },

  cursorType: "pointer",
  focusRing: "auto",
});

/** Headings in the display font, at one weight throughout. */
export const eveHeadings = (fontWeight: string) => ({
  fontFamily: displayFont,
  fontWeight,
  textWrap: "balance" as const,
  sizes: Object.fromEntries(
    (
      [
        ["h1", 38],
        ["h2", 28],
        ["h3", 22],
        ["h4", 18],
        ["h5", 16],
        ["h6", 14],
      ] as const
    ).map(([h, px]) => [
      h,
      { fontSize: rem(px), lineHeight: "1.2", fontWeight },
    ]),
  ) as Record<
    "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
    { fontSize: string; lineHeight: string; fontWeight: string }
  >,
});

/** Design tokens under `theme.other` that both themes read the same way. */
export const eveSharedOther = {
  fonts: {
    display: displayFont,
    body: displayFont,
    mono: monoFont,
  },
  motion: {
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
    fast: "120ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  spacing2xl: rem(40),
  spacing3xl: rem(56),
  headerHeight: rem(60),
  // Faction allegiance / standings palette
  faction: {
    amarr: "#a38365",
    amarrAccent: "#ffd810",
    caldari: "#3fa9ca",
    caldariTeal: "#43c5bd",
    gallente: "#4bbb94",
    minmatar: "#cf5a39",
    ore: "#deba2a",
    sisters: "#e02728",
  },
};
