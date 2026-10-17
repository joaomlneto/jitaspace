import "@testing-library/jest-dom/jest-globals";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  Button,
  createTheme,
  DEFAULT_THEME,
  mergeMantineTheme,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { act, render, screen, waitFor } from "@testing-library/react";

import {
  AppMantineProvider,
  cssVariablesResolver,
} from "~/app/mantine-provider";
import {
  PREFERENCES_STORAGE_KEY,
  setStoredAppTheme,
  usePreferencesStore,
} from "~/lib/preferences";
import { DEFAULT_THEME_SEASON_END } from "~/themes/season";

function ThemePrimaryColorText() {
  const theme = useMantineTheme();

  return <Text data-testid="theme-primary-color">{theme.primaryColor}</Text>;
}

/** Makes `matchMedia` report a coarse pointer, or not, for the next render. */
const mockTouch = (touch: boolean) => {
  const original = window.matchMedia;
  window.matchMedia = (query: string) => ({
    ...original(query),
    matches: touch && query.includes("coarse"),
  });
  return () => {
    window.matchMedia = original;
  };
};

describe("AppMantineProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreferencesStore.setState({
      esiAcceptLanguage: "en",
      appTheme: "minimal",
    });
    // Pinned inside the Default theme's season, so these hold after it ends.
    jest.useFakeTimers({
      now: DEFAULT_THEME_SEASON_END - 24 * 60 * 60 * 1000,
      doNotFake: ["queueMicrotask", "nextTick"],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("applies stored theme from localStorage", async () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { appTheme: "eve", esiAcceptLanguage: "en" },
        version: 0,
      }),
    );

    render(
      <AppMantineProvider>
        <ThemePrimaryColorText />
      </AppMantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-primary-color")).toHaveTextContent(
        "eve",
      );
    });
  });

  it.each([
    ["default", "crimson"],
    ["minimal", DEFAULT_THEME.primaryColor],
  ])("applies the right theme for a stored %s", async (stored, primary) => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ state: { appTheme: stored }, version: 0 }),
    );

    render(
      <AppMantineProvider>
        <ThemePrimaryColorText />
      </AppMantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-primary-color")).toHaveTextContent(
        new RegExp(`^${primary}$`),
      );
    });
  });

  it("shows EVE for Default once the season is over", async () => {
    jest.setSystemTime(DEFAULT_THEME_SEASON_END);
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ state: { appTheme: "default" }, version: 0 }),
    );

    render(
      <AppMantineProvider>
        <ThemePrimaryColorText />
      </AppMantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-primary-color")).toHaveTextContent(
        /^eve$/,
      );
    });
  });

  it("switches an open tab from the season to EVE when the season ends", async () => {
    jest.setSystemTime(DEFAULT_THEME_SEASON_END - 1000);
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ state: { appTheme: "default" }, version: 0 }),
    );

    render(
      <AppMantineProvider>
        <ThemePrimaryColorText />
      </AppMantineProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("theme-primary-color")).toHaveTextContent(
        /^crimson$/,
      );
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("theme-primary-color")).toHaveTextContent(
      /^eve$/,
    );
  });

  it("leaves a chosen theme alone after the season", async () => {
    jest.setSystemTime(DEFAULT_THEME_SEASON_END + 1000);
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ state: { appTheme: "caldari" }, version: 0 }),
    );

    render(
      <AppMantineProvider>
        <ThemePrimaryColorText />
      </AppMantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-primary-color")).toHaveTextContent(
        "caldari_primary",
      );
    });
  });

  it.each([
    [false, "var(--button-height-xs)"],
    [true, ""],
  ])(
    "gives EVE (compact) short buttons only without a touchscreen (touch: %s)",
    async (touch, height) => {
      const restore = mockTouch(touch);
      window.localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({ state: { appTheme: "eve_compact" }, version: 0 }),
      );

      render(
        <AppMantineProvider>
          <Button>Launch</Button>
        </AppMantineProvider>,
      );

      // The text keeps Mantine's default size either way; only the height
      // changes, through the theme's `vars`.
      await waitFor(() => {
        expect(
          screen
            .getByRole("button", { name: "Launch" })
            .style.getPropertyValue("--button-height"),
        ).toBe(height);
      });
      restore();
    },
  );

  it("gives EVE (compact)'s xs buttons EVE's 14px text", async () => {
    const restore = mockTouch(false);
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ state: { appTheme: "eve_compact" }, version: 0 }),
    );

    render(
      <AppMantineProvider>
        <Button size="xs">Launch</Button>
      </AppMantineProvider>,
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Launch" })
          .style.getPropertyValue("--button-fz"),
      ).toBe("var(--mantine-font-size-sm)");
    });
    restore();
  });

  it("updates theme when app theme is changed", async () => {
    render(
      <AppMantineProvider>
        <ThemePrimaryColorText />
      </AppMantineProvider>,
    );

    act(() => {
      setStoredAppTheme("gallente");
    });

    await waitFor(() => {
      expect(screen.getByTestId("theme-primary-color")).toHaveTextContent(
        "gallente_primary",
      );
    });
  });
});

describe("cssVariablesResolver", () => {
  it("lightens dark-scheme dimmed text to meet WCAG AA contrast", () => {
    const resolved = cssVariablesResolver(
      mergeMantineTheme(DEFAULT_THEME, createTheme({})),
    );
    expect(resolved.dark["--mantine-color-dimmed"]).toBe(
      "color-mix(in srgb, var(--mantine-color-dark-2), white 18%)",
    );
    // The light scheme is left as Mantine resolves it.
    expect(resolved.light["--mantine-color-dimmed"]).toBe(
      "var(--mantine-color-gray-6)",
    );
  });
});
