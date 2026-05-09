import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it } from "@jest/globals";
import { Text, useMantineTheme } from "@mantine/core";
import { act, render, screen, waitFor } from "@testing-library/react";

import { AppMantineProvider } from "~/app/mantine-provider";
import {
  APP_THEME_STORAGE_KEY,
  setStoredAppTheme,
  usePreferencesStore,
} from "~/lib/preferences";

function ThemePrimaryColorText() {
  const theme = useMantineTheme();

  return <Text data-testid="theme-primary-color">{theme.primaryColor}</Text>;
}

describe("AppMantineProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreferencesStore.setState({
      esiAcceptLanguage: "en",
      appTheme: "default",
    });
  });

  it("applies stored theme from localStorage", async () => {
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, "eve");

    render(
      <AppMantineProvider>
        <ThemePrimaryColorText />
      </AppMantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-primary-color")).toHaveTextContent(
        "eve_primary",
      );
    });
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
