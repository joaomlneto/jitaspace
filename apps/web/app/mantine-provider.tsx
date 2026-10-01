"use client";

import type { CSSVariablesResolver } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { useLayoutEffect, useMemo, useState } from "react";
import { MantineProvider, v8CssVariablesResolver } from "@mantine/core";

import { usePreferencesStore } from "~/lib/preferences";
import { revealPrePaintTheme } from "~/lib/themePreload";
import { themes } from "~/themes";

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

  // Renders the persisted theme before the browser paints the hydrated page
  // (see lib/themePreload.ts). localStorage is synchronous, so rehydrate() has
  // set the theme by the time it returns. The state flip is what makes that
  // land before the paint: the store's own subscription is attached in a
  // passive effect, which runs after it, whereas an update from a layout effect
  // re-renders synchronously, and that render reads the rehydrated store.
  useLayoutEffect(() => {
    void usePreferencesStore.persist.rehydrate();
    // The synchronous re-render is the point here, not an accident.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPersistedThemeRendered(true);
  }, []);

  // Runs once that re-render has committed — still before the paint — so the
  // app shell the pre-paint script hid is only ever shown already themed.
  useLayoutEffect(() => {
    if (persistedThemeRendered) revealPrePaintTheme();
  }, [persistedThemeRendered]);

  const theme = useMemo(() => themes[selectedTheme], [selectedTheme]);

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
