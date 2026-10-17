"use client";

import type { MantineThemeOverride } from "@mantine/core";
import { Avatar, createTheme, mergeThemeOverrides } from "@mantine/core";

import { colors } from "./colors";
import { crimsonHarvestTheme } from "./crimson-harvest";
import { eveTheme } from "./eve";
import { eveCompactControlsTheme, eveCompactTheme } from "./eve-compact";
import { lightDark } from "./lightDark";
import { DEFAULT_THEME_SEASON } from "./season";
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

// EVE: the faction palettes (colors.ts) underneath, so `eve_primary`,
// `eve_accent` & co. resolve for the app's components, with the theme's own
// tuples (`eve`, `caldari`, `dark`, …) taking precedence over same-named ones.
const eve = mergeThemeOverrides(baseTheme, createTheme({ colors }), eveTheme);

// EVE (compact) on a touchscreen: the tight spacing, but EVE's control sizes.
const eveCompact = mergeThemeOverrides(eve, eveCompactTheme);

export const themes = {
  // The seasonal theme everyone gets until they pick another: EVE, dressed for
  // the current in-game event. Swap the override (and ./season.ts) when the
  // season changes; once the season ends, `resolveAppTheme` shows its fallback.
  default: mergeThemeOverrides(eve, crimsonHarvestTheme),
  minimal: baseTheme,
  eve,
  eve_compact: mergeThemeOverrides(eveCompact, eveCompactControlsTheme),
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
  // EVE on plain black instead of a wallpaper. The light scheme gets a plain
  // pale background instead: page text sits straight on it (e.g. /about), and
  // that text is dark there.
  whpd: mergeThemeOverrides(
    eve,
    createTheme({
      other: {
        appBackground: lightDark("#f1f1f1", "#000"),
        appBackgroundMobile: lightDark("#f1f1f1", "#000"),
      },
    }),
  ),
};

/**
 * Themes that change on a touchscreen (any coarse pointer), to keep their
 * controls easy to tap.
 */
const touchThemes: Partial<Record<keyof typeof themes, MantineThemeOverride>> =
  {
    eve_compact: eveCompact,
  };

/**
 * The Mantine theme for a theme preference: `themes[name]`, except that
 * Default shows its season's fallback (EVE) once the season is over, and a
 * touchscreen gets the theme's touch variant, if it has one.
 */
export function resolveAppTheme(
  name: keyof typeof themes,
  seasonOver: boolean,
  touch = false,
) {
  const resolved =
    name === "default" && seasonOver ? DEFAULT_THEME_SEASON.fallback : name;
  return (touch ? touchThemes[resolved] : undefined) ?? themes[resolved];
}
