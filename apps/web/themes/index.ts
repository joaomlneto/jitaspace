"use client";

import { Avatar, createTheme, mergeThemeOverrides } from "@mantine/core";

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

export const themes = {
  default: baseTheme,
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
