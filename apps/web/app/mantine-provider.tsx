"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useMemo } from "react";
import { MantineProvider } from "@mantine/core";

import { usePreferencesStore } from "~/lib/preferences";
import { themes } from "~/themes";

export const AppMantineProvider = ({ children }: PropsWithChildren) => {
  const selectedTheme = usePreferencesStore((state) => state.appTheme);

  useEffect(() => {
    void usePreferencesStore.persist.rehydrate();
  }, []);

  const theme = useMemo(
    () => themes[selectedTheme] ?? themes.default,
    [selectedTheme],
  );

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      {children}
    </MantineProvider>
  );
};
