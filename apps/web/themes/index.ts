"use client";

import type {} from "@mantine/core";

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
import { crimsonHarvestTheme } from "./crimson-harvest";
import { eveTheme } from "./eve";
import { lightDark } from "./lightDark";
import { WALLPAPERS } from "./wallpapers";

declare module "@mantine/core" {
  interface MantineThemeOther {
    appBackground?: string;
    /** Same wallpaper, cropped and sized for portrait phones. */
    appBackgroundMobile?: string;
  }
}

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

// WHPD was designed for the dark scheme. Its surfaces and default text colours
// carry a light counterpart (`lightDark`), so the light scheme gets pale panels
// with dark text rather than dark panels with dark text.
const whpdPanelStyles = {
  position: "relative",
  overflow: "hidden",
  backgroundColor: lightDark(
    "rgba(245, 247, 255, 0.97)",
    "rgba(0, 1, 8, 0.97)",
  ),
  backgroundImage: `linear-gradient(180deg, ${lightDark(
    "rgba(250, 251, 255, 0.97)",
    "rgba(4, 8, 22, 0.97)",
  )} 0%, ${lightDark("rgba(240, 244, 255, 0.99)", "rgba(1, 3, 14, 0.99)")} 58%, ${lightDark(
    "rgba(232, 238, 255, 1)",
    "rgba(0, 0, 5, 1)",
  )} 100%)`,
  borderColor: "rgba(43, 92, 255, 0.32)",
  borderTopColor: "rgba(85, 127, 255, 0.52)",
  boxShadow: `inset 0 1px 0 rgba(100, 150, 255, 0.14), inset 0 -10px 18px ${lightDark(
    "rgba(43, 92, 255, 0.06)",
    "rgba(0, 0, 15, 0.6)",
  )}, 0 0 28px rgba(43, 92, 255, 0.1)`,
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(110deg, rgba(43, 92, 255, 0.11) 0%, rgba(43, 92, 255, 0) 42%, rgba(255, 26, 26, 0.08) 72%, rgba(255, 26, 26, 0) 100%)",
    pointerEvents: "none",
  },
} as const;

// EVE: the faction palettes (colors.ts) underneath, so `eve_primary`,
// `eve_accent` & co. resolve for the app's components, with the theme's own
// tuples (`eve`, `caldari`, `dark`, …) taking precedence over same-named ones.
const eve = mergeThemeOverrides(baseTheme, createTheme({ colors }), eveTheme);

export const themes = {
  // The seasonal theme everyone gets until they pick another: EVE, dressed for
  // the current in-game event. Swap the override when the season changes.
  default: mergeThemeOverrides(eve, crimsonHarvestTheme),
  minimal: baseTheme,
  eve,
  amarr: mergeThemeOverrides(
    eve,
    createTheme({
      other: {
        ...WALLPAPERS.amarr,
      },
      primaryColor: "amarr_primary",
      primaryShade: 6,
    }),
  ),
  caldari: mergeThemeOverrides(
    eve,
    createTheme({
      other: {
        ...WALLPAPERS.caldari,
      },
      primaryColor: "caldari_primary",
    }),
  ),
  gallente: mergeThemeOverrides(
    eve,
    createTheme({
      other: {
        ...WALLPAPERS.gallente,
      },
      primaryColor: "gallente_primary",
    }),
  ),
  minmatar: mergeThemeOverrides(
    eve,
    createTheme({
      other: {
        ...WALLPAPERS.minmatar,
      },
      primaryColor: "minmatar_primary",
    }),
  ),
  carbon: mergeThemeOverrides(
    eve,
    createTheme({
      primaryColor: "carbon",
      primaryShade: 6,
    }),
  ),
  photon: mergeThemeOverrides(
    eve,
    createTheme({
      primaryColor: "photon",
      primaryShade: 6,
    }),
  ),
  ore: mergeThemeOverrides(
    eve,
    createTheme({
      primaryColor: "ore_primary",
    }),
  ),
  sisters_of_eve: mergeThemeOverrides(
    eve,
    createTheme({
      primaryColor: "sisters_of_eve_primary",
    }),
  ),
  whpd: mergeThemeOverrides(
    eve,
    createTheme({
      // Spelled out: other.* deep-merges over EVE's, so leaving the mobile
      // one unset would show EVE's wallpaper on phones over this black.
      other: {
        appBackground: lightDark("#eef2ff", "#000"),
        appBackgroundMobile: lightDark("#eef2ff", "#000"),
      },
      black: "#000002",
      white: "#eef2ff",
      primaryColor: "whpd_primary",
      primaryShade: 6,
      colors: {
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
            bg: lightDark("#f5f7ff", "#000104"),
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
            bg: lightDark("#f5f7ff", "#000104"),
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
            c: lightDark(
              "var(--mantine-color-whpd_primary-9)",
              "var(--mantine-color-whpd_primary-1)",
            ),
          },
        }),
        Title: Title.extend({
          defaultProps: {
            c: "bright",
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
