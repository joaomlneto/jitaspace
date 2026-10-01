"use client";

import type { CSSVariablesResolver } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo } from "react";
import { MantineProvider, v8CssVariablesResolver } from "@mantine/core";

import { usePreferencesStore } from "~/lib/preferences";
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

  useEffect(() => {
    void usePreferencesStore.persist.rehydrate();
  }, []);

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
