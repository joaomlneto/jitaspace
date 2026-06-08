"use client";

import type {} from "@mantine/core";

declare module "@mantine/core" {
  interface MantineThemeOther {
    wallpaper?: string;
  }
}

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
  // Mantine 9 changed the default radius from `sm` (4px) to `md` (8px).
  // Keep the previous default so existing components render unchanged.
  defaultRadius: "sm",
  components: {
    Avatar: Avatar.extend({
      defaultProps: {
        radius: "sm",
      },
    }),
  },
});

const whpdPanelStyles = {
  position: "relative",
  overflow: "hidden",
  backgroundColor: "rgba(0, 1, 8, 0.97)",
  backgroundImage:
    "linear-gradient(180deg, rgba(4, 8, 22, 0.97) 0%, rgba(1, 3, 14, 0.99) 58%, rgba(0, 0, 5, 1) 100%)",
  borderColor: "rgba(43, 92, 255, 0.32)",
  borderTopColor: "rgba(85, 127, 255, 0.52)",
  boxShadow:
    "inset 0 1px 0 rgba(100, 150, 255, 0.14), inset 0 -10px 18px rgba(0, 0, 15, 0.6), 0 0 28px rgba(43, 92, 255, 0.1)",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(110deg, rgba(43, 92, 255, 0.11) 0%, rgba(43, 92, 255, 0) 42%, rgba(255, 26, 26, 0.08) 72%, rgba(255, 26, 26, 0) 100%)",
    pointerEvents: "none",
  },
} as const;

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
    other: {
      wallpaper:
        "/wallpapers/2026-cradle-of-war/cradle-of-war-nologo-compressed.jpeg",
    },
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
  carbon: mergeThemeOverrides(
    eveTheme,
    createTheme({
      primaryColor: "carbon",
      primaryShade: 6,
      colors,
    }),
  ),
  photon: mergeThemeOverrides(
    eveTheme,
    createTheme({
      primaryColor: "photon",
      primaryShade: 6,
      colors,
    }),
  ),
  amarr: mergeThemeOverrides(
    eveTheme,
    createTheme({
      other: { wallpaper: "/wallpapers/2026-cradle-of-war/amarr_wallpaper.jpg" },
      primaryColor: "amarr_primary",
      primaryShade: 6,
      colors,
    }),
  ),
  caldari: mergeThemeOverrides(
    eveTheme,
    createTheme({
      other: {
        wallpaper: "/wallpapers/2026-cradle-of-war/caldari_wallpaper.jpg",
      },
      primaryColor: "caldari_primary",
      colors,
    }),
  ),
  gallente: mergeThemeOverrides(
    eveTheme,
    createTheme({
      other: {
        wallpaper: "/wallpapers/2026-cradle-of-war/gallente_wallpaper.jpg",
      },
      primaryColor: "gallente_primary",
      colors,
    }),
  ),
  minmatar: mergeThemeOverrides(
    eveTheme,
    createTheme({
      other: {
        wallpaper: "/wallpapers/2026-cradle-of-war/minmatar_wallpaper.jpg",
      },
      primaryColor: "minmatar_primary",
      colors,
    }),
  ),
  ore: mergeThemeOverrides(
    eveTheme,
    createTheme({
      primaryColor: "ore_primary",
      colors,
    }),
  ),
  sisters_of_eve: mergeThemeOverrides(
    eveTheme,
    createTheme({
      primaryColor: "sisters_of_eve_primary",
      colors,
    }),
  ),
  whpd: mergeThemeOverrides(
    eveTheme,
    createTheme({
      black: "#000002",
      white: "#eef2ff",
      primaryColor: "whpd_primary",
      primaryShade: 6,
      colors: {
        ...colors,
        dark: [
          "#d0d4e0",
          "#a8adbf",
          "#80869a",
          "#585e74",
          "#363c52",
          "#252b3e",
          "#141828",
          "#080c18",
          "#030610",
          "#010206",
        ],
      },
      defaultGradient: {
        from: "whpd_primary.6",
        to: "whpd_siren.7",
        deg: 130,
      },
      shadows: {
        xs: "0 0 0 1px rgba(43, 92, 255, 0.22)",
        sm: "0 2px 10px rgba(0, 0, 10, 0.72)",
        md: "0 8px 24px rgba(0, 0, 10, 0.8)",
        lg: "0 14px 36px rgba(0, 0, 10, 0.86)",
        xl: "0 20px 52px rgba(0, 0, 10, 0.92)",
      },
      components: {
        Badge: Badge.extend({
          defaultProps: {
            color: "whpd_siren",
            variant: "outline",
          },
        }),
        Button: Button.extend({
          defaultProps: {
            color: "whpd_primary",
            variant: "outline",
            radius: "xs",
            fw: 600,
            tt: "uppercase",
          },
          styles: {
            root: {
              letterSpacing: "0.04em",
              transition:
                "background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, color 150ms ease, transform 120ms ease",
              "&:active": {
                transform: "translateY(1px)",
              },
              "&[dataVariant='outline']": {
                borderColor: "rgba(43, 92, 255, 0.42)",
                backgroundImage:
                  "linear-gradient(180deg, rgba(10, 20, 60, 0.28) 0%, rgba(2, 4, 18, 0.68) 100%)",
                color: "#c8d8ff",
                "&:hover": {
                  borderColor: "rgba(85, 127, 255, 0.62)",
                  backgroundImage:
                    "linear-gradient(180deg, rgba(15, 28, 75, 0.38) 0%, rgba(4, 8, 28, 0.78) 100%)",
                  boxShadow: "0 0 14px rgba(43, 92, 255, 0.18) inset",
                },
              },
              "&[dataVariant='filled']": {
                border: "1px solid rgba(85, 127, 255, 0.38)",
                backgroundImage:
                  "linear-gradient(180deg, #3869ff 0%, #1e4de8 100%)",
                color: "#eef2ff",
                boxShadow:
                  "inset 0 1px 0 rgba(200, 216, 255, 0.2), 0 0 18px rgba(43, 92, 255, 0.18)",
                "&:hover": {
                  backgroundImage:
                    "linear-gradient(180deg, #4878ff 0%, #2558f0 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(210, 225, 255, 0.24), 0 0 26px rgba(43, 92, 255, 0.26)",
                },
              },
            },
          },
        }),
        Card: Card.extend({
          defaultProps: {
            bg: "#000104",
            radius: "xs",
            shadow: "xs",
            withBorder: true,
          },
          styles: {
            root: {
              ...whpdPanelStyles,
            },
          },
        }),
        Divider: Divider.extend({
          defaultProps: {
            color: "rgba(43, 92, 255, 0.26)",
          },
        }),
        Paper: Paper.extend({
          defaultProps: {
            bg: "#000104",
            radius: "xs",
            shadow: "xs",
            withBorder: true,
          },
          styles: {
            root: {
              ...whpdPanelStyles,
            },
          },
        }),
        Text: Text.extend({
          defaultProps: {
            c: "whpd_primary.1",
          },
        }),
        Title: Title.extend({
          defaultProps: {
            c: "gray.0",
            order: 2,
            tt: "uppercase",
            style: {
              letterSpacing: "0.06em",
            },
          },
        }),
      },
    }),
  ),
};
