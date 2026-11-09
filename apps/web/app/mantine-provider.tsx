"use client";

import type { CSSVariablesResolver } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { MantineProvider, v8CssVariablesResolver } from "@mantine/core";

import { usePreferencesStore } from "~/lib/preferences";
import { revealPrePaintTheme } from "~/lib/themePreload";
import { resolveAppTheme } from "~/themes";
import {
  isDefaultThemeInSeason,
  nextDefaultThemeSeasonChange,
} from "~/themes/season";

/**
 * Mantine's dark-scheme `dimmed` text is the theme's `dark.2` shade, which is
 * 4.0:1 against the default dark body (#828282 on #242424) — under the 4.5:1
 * WCAG AA minimum for body text, and dimmed text here is often 12px. Mixing
 * in 18% white lifts it past 4.5:1 on every dark surface the themes use while
 * keeping each theme's tint and dimmed text visibly quieter than normal text.
 *
 * The light scheme's is `gray.6`, which a theme can replace with
 * `other.lightDimmed` where its pale panels need darker dimmed text (EVE).
 */
export const cssVariablesResolver: CSSVariablesResolver = (theme) => {
  const resolved = v8CssVariablesResolver(theme);
  const lightDimmed = theme.other.lightDimmed;
  return {
    ...resolved,
    light: lightDimmed
      ? { ...resolved.light, "--mantine-color-dimmed": lightDimmed }
      : resolved.light,
    dark: {
      ...resolved.dark,
      "--mantine-color-dimmed":
        "color-mix(in srgb, var(--mantine-color-dark-2), white 18%)",
    },
  };
};

// Any coarse pointer, not just the primary one: a laptop with a touchscreen
// is tapped as well as clicked.
const TOUCH_QUERY = "(any-pointer: coarse)";

export const AppMantineProvider = ({ children }: PropsWithChildren) => {
  const selectedTheme = usePreferencesStore((state) => state.appTheme);

  const [persistedThemeRendered, setPersistedThemeRendered] = useState(false);
  // Whether the Default theme shows its season (themes/season.ts). True on the
  // server and during hydration, which render the seasonal theme as
  // prerendered; the clock is read only in the layout effect below.
  const [inSeason, setInSeason] = useState(true);
  // Whether any pointer is coarse (a touchscreen), for the themes that keep
  // bigger controls there (themes/index.ts). False on the server and during
  // hydration; read in the layout effect below, and followed after that.
  const [touch, setTouch] = useState(false);

  // Renders the persisted theme before the browser paints the hydrated page
  // (see lib/themePreload.ts). localStorage is synchronous, so rehydrate() has
  // set the theme by the time it returns. The state flip is what makes that
  // land before the paint: the store's own subscription is attached in a
  // passive effect, which runs after it, whereas an update from a layout effect
  // re-renders synchronously, and that render reads the rehydrated store.
  // The season is checked in the same effect, so a Default visitor outside the
  // season is switched to its fallback in that same re-render.
  useLayoutEffect(() => {
    void usePreferencesStore.persist.rehydrate();
    // The synchronous re-render is the point here, not an accident.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInSeason(isDefaultThemeInSeason(Date.now()));
    setTouch(window.matchMedia(TOUCH_QUERY).matches);
    setPersistedThemeRendered(true);
  }, []);

  // A touchscreen plugged in or detached (a convertible) switches the theme.
  useEffect(() => {
    const query = window.matchMedia(TOUCH_QUERY);
    const onChange = () => setTouch(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // A tab left open across the season's start or end switches when it does.
  // setTimeout overflows past ~24.8 days (2^31 - 1 ms), so a later change is
  // left to the next page load. The timer sets the state at the boundary
  // itself, not at the clock's reading when it fires, so a timer that fires a
  // little early cannot leave the tab unswitched with no timer left.
  useEffect(() => {
    const now = Date.now();
    const next = nextDefaultThemeSeasonChange(now);
    if (next === null) return;
    const delay = next - now;
    if (delay > 2 ** 31 - 1) return;
    const timer = setTimeout(
      () => setInSeason(isDefaultThemeInSeason(next)),
      delay,
    );
    return () => clearTimeout(timer);
  }, [inSeason]);

  // Runs once that re-render has committed — still before the paint — so the
  // app shell the pre-paint script hid is only ever shown already themed.
  useLayoutEffect(() => {
    if (persistedThemeRendered) revealPrePaintTheme();
  }, [persistedThemeRendered]);

  const theme = useMemo(
    () => resolveAppTheme(selectedTheme, inSeason, touch),
    [selectedTheme, inSeason, touch],
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
