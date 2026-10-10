import type { MantineColorsTuple } from "@mantine/core";
import { createTheme } from "@mantine/core";

import classes from "./crimson-harvest.module.css";
import { lightDark } from "./lightDark";
import { WALLPAPERS } from "./wallpapers";

/**
 * Crimson Harvest — the current season of the Default theme.
 *
 * EVE's annual Blood Raider event, after the 2026 key art: neon blood-red
 * lines on black, a hot ember core where they glow brightest, and a cold blue
 * heart inside the triangle. Crimson leads, ember marks the accents, and the
 * blue is kept for links so they stand apart from everything red.
 *
 * An override over the EVE theme, which it otherwise follows (type, spacing,
 * radii, inputs, modals). ./index.ts merges it over EVE as `themes.default`;
 * next season, swap this override for another.
 */

/* ---- Color tuples (index 0 = lightest … 9 = darkest) ---------- */

// Blood red — the neon of the key art's lines. primaryShade 6 on the dark
// scheme (#f01408), 7 on the light one (#c80e05) for contrast on pale panels.
const crimson: MantineColorsTuple = [
  "#ffe8e6",
  "#ffcfcb",
  "#ff9f97",
  "#ff6b60",
  "#ff3f33",
  "#ff2417",
  "#f01408",
  "#c80e05",
  "#9f0a03",
  "#760600",
];

// Ember — the sparks and the lines' hot core. Badges and key figures.
const ember: MantineColorsTuple = [
  "#fff3e0",
  "#ffe2bd",
  "#ffc685",
  "#ffa84d",
  "#ff8f24",
  "#ff7f0d",
  "#f57200",
  "#d25f00",
  "#a84b00",
  "#7f3800",
];

// Frost — the cold blue inside the triangle. Links.
const frost: MantineColorsTuple = [
  "#e3f2fd",
  "#c4e2fa",
  "#94caf5",
  "#62b0ef",
  "#3d9be9",
  "#2a8de4",
  "#1e7fd6",
  "#176bb8",
  "#115896",
  "#0b4474",
];

// Mantine's dark scale, warmed towards red: dark.0 is the dark scheme's text,
// dark.2 its dimmed text, dark.7 its body.
const dark: MantineColorsTuple = [
  "#e6dada",
  "#c4b2b2",
  "#9e8a8a",
  "#735f60",
  "#4f3e3f",
  "#3b2c2d",
  "#2a1d1e",
  "#160d0e",
  "#0e0707",
  "#070303",
];

/* ---- Surfaces ------------------------------------------------- */

// Glass panels tinted blood-red, with a faint crimson-to-ember sheen across
// them; pale and warm on the light scheme.
const panel = {
  bg: lightDark("#fbf4f3", "#0d0506"),
  backgroundImage: [
    `linear-gradient(110deg, ${lightDark(
      "rgba(200, 14, 5, 0.05)",
      "rgba(255, 36, 23, 0.1)",
    )} 0%, rgba(255, 36, 23, 0) 45%, rgba(255, 127, 13, 0) 70%, ${lightDark(
      "rgba(245, 114, 0, 0.05)",
      "rgba(255, 127, 13, 0.07)",
    )} 100%)`,
    `linear-gradient(180deg, ${lightDark(
      "rgba(255, 250, 249, 0.94)",
      "rgba(40, 10, 12, 0.9)",
    )} 0%, ${lightDark("rgba(251, 242, 241, 0.95)", "rgba(19, 6, 8, 0.93)")} 58%, ${lightDark(
      "rgba(246, 233, 231, 0.97)",
      "rgba(9, 3, 4, 0.96)",
    )} 100%)`,
  ].join(", "),
  borderColor: lightDark("rgba(160, 40, 35, 0.28)", "rgba(255, 60, 50, 0.24)"),
  borderTopColor: lightDark(
    "rgba(200, 14, 5, 0.55)",
    "rgba(255, 70, 55, 0.62)",
  ),
  boxShadow: `inset 0 1px 0 ${lightDark(
    "rgba(255, 255, 255, 0.8)",
    "rgba(255, 120, 100, 0.16)",
  )}, inset 0 -10px 18px ${lightDark(
    "rgba(160, 40, 35, 0.06)",
    "rgba(10, 0, 0, 0.45)",
  )}, 0 0 24px ${lightDark("rgba(200, 20, 10, 0.08)", "rgba(255, 30, 20, 0.12)")}`,
} as const;

const panelStyles = {
  root: {
    backgroundImage: panel.backgroundImage,
    borderColor: panel.borderColor,
    borderTopColor: panel.borderTopColor,
    boxShadow: panel.boxShadow,
  },
};

/* ---- Theme --------------------------------------------------- */

export const crimsonHarvestTheme = createTheme({
  primaryColor: "crimson",
  primaryShade: { light: 7, dark: 6 },

  white: "#fbf4f3",
  black: "#070203",

  colors: { crimson, ember, frost, dark },

  defaultGradient: { from: "crimson.6", to: "ember.5", deg: 130 },

  shadows: {
    xs: "0 0 0 1px rgba(255, 60, 45, 0.2)",
    sm: "0 2px 10px rgba(12, 0, 0, 0.6)",
    md: "0 8px 24px rgba(12, 0, 0, 0.68)",
    lg: "0 14px 36px rgba(12, 0, 0, 0.76)",
    xl: "0 20px 52px rgba(12, 0, 0, 0.82)",
  },

  components: {
    Paper: {
      defaultProps: { bg: panel.bg },
      styles: panelStyles,
    },

    Card: {
      defaultProps: { bg: panel.bg },
      styles: panelStyles,
    },

    Button: {
      classNames: { root: classes.button },
    },

    Badge: {
      defaultProps: { color: "ember" },
    },

    Input: {
      styles: {
        input: {
          backgroundColor: lightDark(
            "rgba(255, 250, 249, 0.9)",
            "rgba(16, 5, 6, 0.75)",
          ),
          borderColor: lightDark(
            "rgba(160, 40, 35, 0.3)",
            "rgba(255, 90, 75, 0.26)",
          ),
        },
      },
    },

    Modal: {
      styles: {
        overlay: { backgroundColor: "rgba(10, 0, 0, 0.72)" },
      },
    },

    Divider: {
      styles: {
        root: {
          borderColor: lightDark(
            "rgba(160, 40, 35, 0.26)",
            "rgba(255, 60, 50, 0.3)",
          ),
        },
      },
    },

    Anchor: {
      styles: { root: { color: lightDark("#176bb8", "#62b0ef") } },
    },

    Title: {
      classNames: { root: classes.title },
    },
  },

  other: {
    ...WALLPAPERS.crimsonHarvest,
  },
});
