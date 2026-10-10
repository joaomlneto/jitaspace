"use client";

import type { CSSVariablesResolver } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { MantineProvider, v8CssVariablesResolver } from "@mantine/core";

import { usePreferencesStore } from "~/lib/preferences";
import { revealPrePaintTheme } from "~/lib/themePreload";
import { resolveAppTheme } from "~/themes";
import {
  DEFAULT_THEME_SEASON_END,
  isDefaultThemeSeasonOver,
} from "~/themes/season";

/**
 * Mantine's dark-scheme `dimmed` text is the theme's `dark.2` shade, which is
 * 4.0:1 against the default dark body (#828282 on #242424) — under the 4.5:1
 * WCAG AA minimum for body text, and dimmed text here is often 12px. Mixing
 * in 18% white lifts it past 4.5:1 on every dark surface the themes use while
 * keeping each theme's tint and dimmed text visibly quieter than normal text.
 */
export const cssVariablesResolver: CSSVariablesResolver = (theme) => {
  const resolved = v8CssVariablesResolver(theme);
  return {
    ...resolved,
    dark: {
      ...resolved.dark,
      "--mantine-color-dimmed":
        "color-mix(in srgb, var(--mantine-color-dark-2), white 18%)",
    },
  };
};

export const AppMantineProvider = ({ children }: PropsWithChildren) => {
  const selectedTheme = usePreferencesStore((state) => state.appTheme);

  const [persistedThemeRendered, setPersistedThemeRendered] = useState(false);
  // Whether the Default theme's season has ended (themes/season.ts). False on
  // the server and during hydration, which render the seasonal theme as
  // prerendered; the clock is read only in the layout effect below.
  const [seasonOver, setSeasonOver] = useState(false);

  // Renders the persisted theme before the browser paints the hydrated page
  // (see lib/themePreload.ts). localStorage is synchronous, so rehydrate() has
  // set the theme by the time it returns. The state flip is what makes that
  // land before the paint: the store's own subscription is attached in a
  // passive effect, which runs after it, whereas an update from a layout effect
  // re-renders synchronously, and that render reads the rehydrated store.
  // The season is checked in the same effect, so a Default visitor past the
  // season's end is switched to its fallback in that same re-render.
  useLayoutEffect(() => {
    void usePreferencesStore.persist.rehydrate();
    // The synchronous re-render is the point here, not an accident.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeasonOver(isDefaultThemeSeasonOver(Date.now()));
    setPersistedThemeRendered(true);
  }, []);

  // A tab left open across the season's end switches when it ends. setTimeout
  // overflows past ~24.8 days (2^31 - 1 ms), so a later end is left to the
  // next page load.
  useEffect(() => {
    if (seasonOver) return;
    const delay = DEFAULT_THEME_SEASON_END - Date.now();
    if (delay <= 0 || delay > 2 ** 31 - 1) return;
    const timer = setTimeout(() => setSeasonOver(true), delay);
    return () => clearTimeout(timer);
  }, [seasonOver]);

  // Runs once that re-render has committed — still before the paint — so the
  // app shell the pre-paint script hid is only ever shown already themed.
  useLayoutEffect(() => {
    if (persistedThemeRendered) revealPrePaintTheme();
  }, [persistedThemeRendered]);

  const theme = useMemo(
    () => resolveAppTheme(selectedTheme, seasonOver),
    [selectedTheme, seasonOver],
  );

  return (
    <MantineProvider
      defaultColorScheme="dark"
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
    >
      {children}
    </MantineProvider>
  );
};
