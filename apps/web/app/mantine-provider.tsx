"use client";

import type { PropsWithChildren } from "react";
import { useLayoutEffect, useMemo, useState } from "react";
import { MantineProvider, v8CssVariablesResolver } from "@mantine/core";

import { usePreferencesStore } from "~/lib/preferences";
import { revealPrePaintTheme } from "~/lib/themePreload";
import { themes } from "~/themes";

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
      cssVariablesResolver={v8CssVariablesResolver}
    >
      {children}
    </MantineProvider>
  );
};
