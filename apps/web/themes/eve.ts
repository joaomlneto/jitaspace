import type { MantineColorsTuple } from "@mantine/core";
import { createTheme } from "@mantine/core";

import { contrastComponents, variantColorResolver } from "./contrast";
import classes from "./eve.module.css";
import { lightDark } from "./lightDark";
import { WALLPAPERS } from "./wallpapers";

/**
 * EVE — the app's EVE Online look, and the base the faction themes extend.
 *
 * After the EVE launcher's own theme: flat translucent near-black panels over
 * the wallpaper, neutral greys, the launcher's teal primary with dark text on
 * filled controls, square corners and heavy uppercase buttons. Rajdhani
 * stands in for the launcher's Shentox (a commercial face), with JetBrains
 * Mono for numerics. Amber-gold and the Caldari blues stay as accents.
 *
 * The launcher is dark only; the light scheme keeps the same structure on
 * pale neutral panels.
 *
 * Exported as a standalone Mantine theme override; the registry in
 * ./index.ts merges it over the shared base theme.
 */

const rem = (px: number): string => `${px / 16}rem`;

// Font stacks. The `--font-*` variables come from next/font (app/fonts.ts, set
// on <html> by the root layout). Their fallback is the plain family name, so
// the stack stays valid — and a locally installed copy still applies — where
// the variable is unset: a `var()` with no fallback that fails to resolve
// invalidates the whole `font-family` declaration, not just its first entry.
const displayFont =
  'var(--font-rajdhani, "Rajdhani"), "Inter", "Segoe UI", sans-serif';
const monoFont =
  'var(--font-jetbrains-mono, "JetBrains Mono"), "SFMono-Regular", ui-monospace, monospace';

/* ---- Color tuples (index 0 = lightest … 9 = darkest) ---------- */

// The launcher's neutral greys, placed where Mantine's dark scheme reads
// them: dark.0 is the text (#F1F1F1), dark.2 the dimmed text (#B0B0B0),
// dark.4 every border and divider (#474746), dark.6 inputs, popovers and
// menus (#202020), and dark.7 the body, modals and drawers (#101010).
const dark: MantineColorsTuple = [
  "#f1f1f1",
  "#cfcfcf",
  "#b0b0b0",
  "#7a7a79",
  "#474746",
  "#333332",
  "#202020",
  "#101010",
  "#0a0a0a",
  "#050505",
];

// EVE primary — the launcher's brand teal, re-indexed for Mantine. The
// launcher fills with its shade 3 (#5ccbcb) and hovers with its shade 4, but
// primaryShade picks the same index for every colour, and 3 would turn red
// and green fills pastel. So the launcher's shades sit higher here: on the
// dark scheme, primaryShade 6 fills with #5ccbcb and hovers with #46c4c4,
// outlines take shade 2 and text and links shade 4 (#7dd5d5). On the light
// one, 8 (#247070) keeps 5:1 on the pale panels.
const eve: MantineColorsTuple = [
  "#e3f7f7",
  "#c6eeee",
  "#a9e5e5",
  "#8ddbdb",
  "#7dd5d5",
  "#6cd0d0",
  "#5ccbcb",
  "#46c4c4",
  "#247070",
  "#1d5959",
];

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

/* ---- Surfaces ------------------------------------------------- */

// The launcher's primary container: #101010 at 70% over the wallpaper, flat,
// with Mantine's default border (dark.4 on the dark scheme).
const panelBg = lightDark("rgba(250, 250, 250, 0.92)", "rgba(16, 16, 16, 0.7)");

/* ---- Theme --------------------------------------------------- */

export const eveTheme = createTheme({
  /* Foundations */
  primaryColor: "eve",
  primaryShade: { light: 8, dark: 6 },
  // Dark text on light fills: the launcher's filled buttons are #101010 on
  // teal.
  autoContrast: true,
  variantColorResolver,

  white: "#f1f1f1",
  black: "#101010",

  colors: {
    dark,
    eve,
    gold,
    caldari,
    teal,
    green,
    rust,
  },

  /* Type — Rajdhani everywhere, JetBrains Mono for numerics/code */
  fontFamily: displayFont,
  fontFamilyMonospace: monoFont,

  headings: {
    fontFamily: displayFont,
    fontWeight: "700",
    textWrap: "balance",
    sizes: {
      h1: { fontSize: rem(38), lineHeight: "1.2", fontWeight: "700" },
      h2: { fontSize: rem(28), lineHeight: "1.2", fontWeight: "700" },
      h3: { fontSize: rem(22), lineHeight: "1.2", fontWeight: "700" },
      h4: { fontSize: rem(18), lineHeight: "1.2", fontWeight: "700" },
      h5: { fontSize: rem(16), lineHeight: "1.2", fontWeight: "700" },
      h6: { fontSize: rem(14), lineHeight: "1.2", fontWeight: "700" },
    },
  },

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

  /* Radii — square everywhere, as in the launcher. Explicit pixel or
     percentage radii (round avatars, dots) are unaffected. */
  defaultRadius: "xs",
  radius: {
    xs: "0",
    sm: "0",
    md: "0",
    lg: "0",
    xl: "0",
  },

  /* Shadows — the launcher's panels are flat; these only lift overlays */
  shadows: {
    xs: "0 0 0 1px rgba(71, 71, 70, 0.6)",
    sm: "0 2px 10px rgba(0, 0, 0, 0.5)",
    md: "0 8px 24px rgba(0, 0, 0, 0.6)",
    lg: "0 14px 36px rgba(0, 0, 0, 0.68)",
    xl: "0 20px 52px rgba(0, 0, 0, 0.75)",
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
  defaultGradient: { from: "eve.4", to: "eve.7", deg: 180 },

  /* Component defaults & overrides — the launcher's panel/button look.
     Inputs, checkboxes, dividers, notifications and dropdown surfaces need
     no override: Mantine's dark scheme reads them from the `dark` scale
     above, which already holds the launcher's colours. */
  components: {
    Paper: {
      defaultProps: {
        radius: "xs",
        withBorder: true,
        bg: panelBg,
      },
    },

    Card: {
      defaultProps: {
        radius: "xs",
        withBorder: true,
        padding: "lg",
        bg: panelBg,
      },
    },

    Button: {
      // Filled by default, as in the launcher: teal with dark text.
      defaultProps: {
        radius: "xs",
        variant: "filled",
      },
      styles: {
        root: {
          fontFamily: displayFont,
          // The launcher's 800; Rajdhani's heaviest is 700.
          fontWeight: 700,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          transition:
            "color 150ms cubic-bezier(.4,0,.2,1), border-color 150ms cubic-bezier(.4,0,.2,1), box-shadow 150ms cubic-bezier(.4,0,.2,1)",
        },
      },
    },

    Badge: {
      defaultProps: { radius: "xs" },
      styles: {
        root: {
          fontFamily: displayFont,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        },
      },
    },

    Input: {
      defaultProps: { radius: "xs" },
    },

    InputWrapper: {
      classNames: { label: classes.label },
    },

    Menu: {
      classNames: { dropdown: classes.menuDropdown },
    },

    Combobox: {
      classNames: { dropdown: classes.comboboxDropdown },
    },

    Popover: {
      classNames: { dropdown: classes.overlayDropdown },
    },

    HoverCard: {
      classNames: { dropdown: classes.overlayDropdown },
    },

    Modal: {
      defaultProps: { radius: "xs", overlayProps: { blur: 6 } },
      styles: {
        overlay: { backgroundColor: "rgba(0, 0, 0, 0.7)" },
      },
    },

    Anchor: {
      classNames: { root: classes.anchor },
    },

    ...contrastComponents,

    // Mantine's own tooltip is already the launcher's: inverted, light on
    // the dark scheme, at font size sm (14px).
    Tooltip: {
      defaultProps: { radius: "xs", withArrow: true },
    },

    ScrollArea: {
      defaultProps: { scrollbarSize: 8 },
      classNames: { thumb: classes.thumb },
    },

    Title: {
      styles: {
        root: {
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        },
      },
    },
  },

  /* Escape hatch — design tokens not modeled by Mantine props.
     Read via theme.other.* */
  other: {
    // Cradle of War, under a 68% black overlay. Faction themes swap in their
    // own wallpaper.
    ...WALLPAPERS.cradleOfWar,
    fonts: {
      display: displayFont,
      body: displayFont,
      mono: monoFont,
    },
    letterSpacing: {
      tight: "-0.01em",
      normal: "0",
      wide: "0.5px", // buttons
      wider: "0.04em", // titles
      caps: "0.12em", // overlines / eyebrows
    },
    // The launcher's colour tokens.
    surfaces: {
      app: "#101010",
      panel: "rgba(16, 16, 16, 0.7)",
      panel2: "rgba(16, 16, 16, 0.5)",
      popover: "#202020",
      input: "#202020",
      hover: "#333332",
      selected: "rgba(92, 203, 203, 0.16)",
    },
    text: {
      strong: "#f1f1f1",
      body: "#f1f1f1",
      dimmed: "#b0b0b0",
      muted: "#7a7a79",
      disabled: "#474746",
      accent: "#d0ac61",
      link: "#7dd5d5",
    },
    borders: {
      panel: "#474746",
      subtle: "#474746",
      strong: "#5ccbcb",
      input: "#474746",
      width: "1px",
      widthAccent: "2px",
    },
    gradients: {
      appOverlay: "linear-gradient(rgba(0,0,0,.68), rgba(0,0,0,.68))",
    },
    shadows: {
      ringFocus: "0 0 0 1px #5ccbcb, 0 0 0 4px rgba(92, 203, 203, 0.18)",
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
    // The launcher's status colours, plus Omega gold and PLEX orange.
    status: {
      positive: "#8dc169",
      negative: "#ff454b",
      warning: "#f67c0f",
      info: "#2196f3",
      concord: "#547d8e",
      omega: "#fab400",
      plex: "#f67c0f",
    },
  },
});

export default eveTheme;
