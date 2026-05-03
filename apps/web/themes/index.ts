"use client";

import {
  Avatar,
  Badge,
  Button,
  Card,
  createTheme,
  Divider,
  mergeThemeOverrides,
  Paper,
  Text,
  Title,
} from "@mantine/core";

import { colors } from "./colors";

const baseTheme = createTheme({
  components: {
    Avatar: Avatar.extend({
      defaultProps: {
        radius: "sm",
      },
    }),
  },
});

const evePanelStyles = {
  position: "relative",
  overflow: "hidden",
  backgroundColor: "rgba(8, 11, 17, 0.88)",
  backgroundImage:
    "linear-gradient(180deg, rgba(26, 33, 45, 0.9) 0%, rgba(13, 18, 28, 0.93) 58%, rgba(8, 11, 18, 0.96) 100%)",
  borderColor: "rgba(108, 132, 151, 0.28)",
  borderTopColor: "rgba(147, 214, 224, 0.46)",
  boxShadow:
    "inset 0 1px 0 rgba(182, 210, 230, 0.12), inset 0 -10px 18px rgba(2, 8, 16, 0.35), 0 10px 22px rgba(0, 0, 0, 0.36)",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(110deg, rgba(84, 194, 201, 0.09) 0%, rgba(84, 194, 201, 0) 45%, rgba(130, 76, 152, 0.08) 75%, rgba(130, 76, 152, 0) 100%)",
    pointerEvents: "none",
  },
} as const;

const eveTheme = mergeThemeOverrides(
  baseTheme,
  createTheme({
    black: "#04070c",
    white: "#f2f7fb",
    primaryColor: "eve_primary",
    primaryShade: 7,
    colors: {
      ...colors,
      dark: [
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
      ],
    },
    fontFamily: "Rajdhani, Inter, Segoe UI, sans-serif",
    fontFamilyMonospace: "JetBrains Mono, SFMono-Regular, monospace",
    headings: {
      fontFamily: "Rajdhani, Inter, Segoe UI, sans-serif",
      fontWeight: "600",
    },
    defaultRadius: "sm",
    spacing: {
      xs: "0.625rem",
      sm: "0.75rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
    },
    radius: {
      xs: "2px",
      sm: "4px",
      md: "6px",
      lg: "10px",
      xl: "14px",
    },
    shadows: {
      xs: "0 0 0 1px rgba(110, 150, 179, 0.2)",
      sm: "0 2px 10px rgba(1, 10, 20, 0.56)",
      md: "0 8px 24px rgba(1, 10, 20, 0.64)",
      lg: "0 14px 36px rgba(1, 10, 20, 0.72)",
      xl: "0 20px 52px rgba(1, 10, 20, 0.78)",
    },
    defaultGradient: {
      from: "eve_primary.6",
      to: "eve_secondary.8",
      deg: 130,
    },
    components: {
      Badge: Badge.extend({
        defaultProps: {
          color: "eve_accent",
          variant: "outline",
        },
      }),
      Button: Button.extend({
        defaultProps: {
          color: "eve_primary",
          variant: "outline",
          radius: "xs",
          fw: 600,
          tt: "uppercase",
        },
        styles: {
          root: {
            letterSpacing: "0.035em",
            transition:
              "background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, color 150ms ease, transform 120ms ease",
            "&:active": {
              transform: "translateY(1px)",
            },
            "&[dataVariant='outline']": {
              borderColor: "rgba(198, 212, 226, 0.24)",
              backgroundImage:
                "linear-gradient(180deg, rgba(52, 63, 79, 0.26) 0%, rgba(19, 27, 39, 0.64) 100%)",
              color: "#e2ebf2",
              "&:hover": {
                borderColor: "rgba(131, 219, 227, 0.52)",
                backgroundImage:
                  "linear-gradient(180deg, rgba(61, 75, 94, 0.34) 0%, rgba(22, 31, 45, 0.76) 100%)",
                boxShadow: "0 0 0 1px rgba(124, 212, 221, 0.18) inset",
              },
            },
            "&[dataVariant='filled']": {
              border: "1px solid rgba(138, 222, 229, 0.38)",
              backgroundImage:
                "linear-gradient(180deg, #35949d 0%, #236a74 100%)",
              color: "#eaf8fc",
              boxShadow:
                "inset 0 1px 0 rgba(210, 247, 250, 0.24), 0 0 18px rgba(47, 143, 154, 0.2)",
              "&:hover": {
                backgroundImage:
                  "linear-gradient(180deg, #3fa3ad 0%, #2a7983 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(222, 250, 252, 0.28), 0 0 24px rgba(68, 167, 175, 0.26)",
              },
            },
          },
        },
      }),
      Card: Card.extend({
        defaultProps: {
          bg: "#070b11",
          radius: "xs",
          shadow: "xs",
          withBorder: true,
        },
        styles: {
          root: {
            ...evePanelStyles,
          },
        },
      }),
      Divider: Divider.extend({
        defaultProps: {
          color: "rgba(111, 146, 172, 0.34)",
        },
      }),
      Paper: Paper.extend({
        defaultProps: {
          bg: "#070b11",
          radius: "xs",
          shadow: "xs",
          withBorder: true,
        },
        styles: {
          root: {
            ...evePanelStyles,
          },
        },
      }),
      Text: Text.extend({
        defaultProps: {
          c: "eve.1",
        },
      }),
      Title: Title.extend({
        defaultProps: {
          c: "gray.0",
          order: 2,
          tt: "uppercase",
          style: {
            letterSpacing: "0.05em",
          },
        },
      }),
    },
  }),
);

export const themes = {
  default: baseTheme,
  eve: eveTheme,
  amarr: mergeThemeOverrides(
    baseTheme,
    createTheme({
      primaryColor: "amarr_primary",
      primaryShade: 6,
      colors,
    }),
  ),
  caldari: mergeThemeOverrides(
    baseTheme,
    createTheme({
      primaryColor: "caldari_primary",
      colors,
    }),
  ),
  gallente: mergeThemeOverrides(
    baseTheme,
    createTheme({
      primaryColor: "gallente_primary",
      colors,
    }),
  ),
  minmatar: mergeThemeOverrides(
    baseTheme,
    createTheme({
      primaryColor: "minmatar_primary",
      colors,
    }),
  ),
};
