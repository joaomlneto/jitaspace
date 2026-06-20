import type { MantineColorsTuple } from "@mantine/core";
import { createTheme } from "@mantine/core";

/**
 * EVE v2 — a refined take on the EVE theme.
 *
 * Dark-first cool steel-blue surfaces, muted teal primary, amber-gold accent,
 * Caldari signal blues, sharp 2px corners, deep cool shadows, Rajdhani UI +
 * JetBrains Mono numerics and uppercase tracked labels.
 *
 * Exported as a standalone Mantine theme override; the registry in
 * ./index.ts merges it over the shared base theme.
 */

const rem = (px: number): string => `${px / 16}rem`;

// EVE v2 background — the same Cradle of War wallpaper the EVE theme uses, with
// a 55% black overlay, so v2 reads as a sibling of v1.
const appBackground =
  "linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)),url(/wallpapers/2026-cradle-of-war/cradle-of-war-nologo-compressed.jpeg) center/cover fixed no-repeat";

/* ---- Color tuples (index 0 = lightest … 9 = darkest) ---------- */

const dark: MantineColorsTuple = [
  "#d5d7e0",
  "#adb0bc",
  "#868b9a",
  "#5f6678",
  "#3f485f",
  "#30384e",
  "#21283c",
  "#111111",
  "#0d0f17",
  "#07090f",
];

// EVE primary — muted teal-blue. primaryShade 7 (#446a79).
const eve: MantineColorsTuple = [
  "#d9ecef",
  "#c5dde2",
  "#a8c6ce",
  "#8caeba",
  "#7398a7",
  "#618999",
  "#547d8e",
  "#446a79",
  "#375968",
  "#264956",
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

/* ---- Theme --------------------------------------------------- */

export const eveV2Theme = createTheme({
  /* Foundations */
  primaryColor: "eve",
  primaryShade: { light: 6, dark: 7 },

  white: "#f2f7fb",
  black: "#04070c",

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
  fontFamily: '"Rajdhani", "Inter", "Segoe UI", sans-serif',
  fontFamilyMonospace:
    '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',

  headings: {
    fontFamily: '"Rajdhani", "Inter", "Segoe UI", sans-serif',
    fontWeight: "600",
    textWrap: "balance",
    sizes: {
      h1: { fontSize: rem(38), lineHeight: "1.2", fontWeight: "600" },
      h2: { fontSize: rem(28), lineHeight: "1.2", fontWeight: "600" },
      h3: { fontSize: rem(22), lineHeight: "1.2", fontWeight: "600" },
      h4: { fontSize: rem(18), lineHeight: "1.2", fontWeight: "600" },
      h5: { fontSize: rem(16), lineHeight: "1.2", fontWeight: "600" },
      h6: { fontSize: rem(14), lineHeight: "1.2", fontWeight: "600" },
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

  /* Radii — sharp / militaristic, xs & sm dominate */
  defaultRadius: "xs",
  radius: {
    xs: rem(2),
    sm: rem(4),
    md: rem(6),
    lg: rem(10),
    xl: rem(14),
  },

  /* Shadows — deep, cool (not pure black) */
  shadows: {
    xs: "0 0 0 1px rgba(110, 150, 179, 0.2)",
    sm: "0 2px 10px rgba(1, 10, 20, 0.56)",
    md: "0 8px 24px rgba(1, 10, 20, 0.64)",
    lg: "0 14px 36px rgba(1, 10, 20, 0.72)",
    xl: "0 20px 52px rgba(1, 10, 20, 0.78)",
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
  defaultGradient: { from: "#35949d", to: "#236a74", deg: 180 },

  /* Component defaults & overrides — the JitaSpace panel/button look */
  components: {
    Paper: {
      defaultProps: {
        radius: "xs",
        withBorder: true,
        bg: "#070b11",
      },
      styles: {
        root: {
          backgroundImage:
            "linear-gradient(180deg, rgba(26,33,45,.9) 0%, rgba(13,18,28,.93) 58%, rgba(8,11,18,.96) 100%)",
          borderColor: "rgba(108, 132, 151, 0.28)",
          borderTopColor: "rgba(147, 214, 224, 0.46)",
          boxShadow:
            "inset 0 1px 0 rgba(182,210,230,.12), inset 0 -10px 18px rgba(2,8,16,.35), 0 10px 22px rgba(0,0,0,.36)",
        },
      },
    },

    Card: {
      defaultProps: {
        radius: "xs",
        withBorder: true,
        padding: "lg",
        bg: "#070b11",
      },
      styles: {
        root: {
          backgroundImage:
            "linear-gradient(180deg, rgba(26,33,45,.9) 0%, rgba(13,18,28,.93) 58%, rgba(8,11,18,.96) 100%)",
          borderColor: "rgba(108, 132, 151, 0.28)",
          borderTopColor: "rgba(147, 214, 224, 0.46)",
          boxShadow:
            "inset 0 1px 0 rgba(182,210,230,.12), inset 0 -10px 18px rgba(2,8,16,.35), 0 10px 22px rgba(0,0,0,.36)",
        },
      },
    },

    Button: {
      defaultProps: {
        radius: "xs",
        variant: "outline",
      },
      styles: {
        root: {
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 600,
          letterSpacing: "0.035em",
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
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        },
      },
    },

    Input: {
      defaultProps: { radius: "xs" },
      styles: {
        input: {
          backgroundColor: "rgba(8, 12, 18, 0.72)",
          borderColor: "rgba(198, 212, 226, 0.24)",
        },
      },
    },

    Modal: {
      defaultProps: { radius: "xs", overlayProps: { blur: 6 } },
      styles: {
        overlay: { backgroundColor: "rgba(2, 5, 10, 0.7)" },
      },
    },

    Tooltip: {
      defaultProps: { radius: "xs", color: "dark" },
    },

    Divider: {
      styles: { root: { borderColor: "rgba(111, 146, 172, 0.34)" } },
    },

    Anchor: {
      styles: { root: { color: "#64b9d2" } },
    },

    Title: {
      styles: {
        root: {
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        },
      },
    },
  },

  /* Escape hatch — design tokens not modeled by Mantine props.
     Read via theme.other.* */
  other: {
    appBackground,
    fonts: {
      display: '"Rajdhani", "Inter", "Segoe UI", sans-serif',
      body: '"Rajdhani", "Inter", "Segoe UI", sans-serif',
      mono: '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',
    },
    letterSpacing: {
      tight: "-0.01em",
      normal: "0",
      wide: "0.035em", // buttons
      wider: "0.05em", // titles
      caps: "0.12em", // overlines / eyebrows
    },
    surfaces: {
      app: "#04070c",
      panel: "#070b11",
      panel2: "#0d1219",
      input: "rgba(8, 12, 18, 0.72)",
      hover: "rgba(61, 75, 94, 0.34)",
      selected: "rgba(63, 169, 202, 0.16)",
    },
    text: {
      strong: "#f2f7fb",
      body: "#c5dde2",
      dimmed: "#7e96a6",
      muted: "#5f6678",
      accent: "#d0ac61",
      link: "#64b9d2",
    },
    borders: {
      panel: "rgba(108, 132, 151, 0.28)",
      panelTop: "rgba(147, 214, 224, 0.46)",
      subtle: "rgba(111, 146, 172, 0.34)",
      strong: "rgba(131, 219, 227, 0.52)",
      input: "rgba(198, 212, 226, 0.24)",
      width: "1px",
      widthAccent: "2px",
    },
    gradients: {
      panelFill:
        "linear-gradient(180deg, rgba(26,33,45,.9) 0%, rgba(13,18,28,.93) 58%, rgba(8,11,18,.96) 100%)",
      panelSheen:
        "linear-gradient(110deg, rgba(84,194,201,.09) 0%, rgba(84,194,201,0) 45%, rgba(130,76,152,.08) 75%, rgba(130,76,152,0) 100%)",
      btnOutline:
        "linear-gradient(180deg, rgba(52,63,79,.26) 0%, rgba(19,27,39,.64) 100%)",
      btnOutlineHover:
        "linear-gradient(180deg, rgba(61,75,94,.34) 0%, rgba(22,31,45,.76) 100%)",
      btnFilled: "linear-gradient(180deg, #35949d 0%, #236a74 100%)",
      btnFilledHover: "linear-gradient(180deg, #3fa3ad 0%, #2a7983 100%)",
      appOverlay: "linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55))",
    },
    shadows: {
      panel:
        "inset 0 1px 0 rgba(182,210,230,.12), inset 0 -10px 18px rgba(2,8,16,.35), 0 10px 22px rgba(0,0,0,.36)",
      ringFocus:
        "0 0 0 1px rgba(124,212,221,.55), 0 0 0 4px rgba(63,169,202,.18)",
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
    status: {
      positive: "#4bbb94",
      negative: "#cf5a39",
      warning: "#c5983d",
      info: "#3fa9ca",
      concord: "#547d8e",
    },
  },
});

export default eveV2Theme;
