import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AppMantineProvider } from "~/app/mantine-provider";
import {
  PREFERENCES_STORAGE_KEY,
  usePreferencesStore,
} from "~/lib/preferences";

const mockSetAcceptLanguage = jest.fn<(value?: string) => void>();

jest.mock("@jitaspace/esi-client", () => ({
  setAcceptLanguage: (...args: [string | undefined]) =>
    mockSetAcceptLanguage(...args),
}));

describe("SettingsCard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSetAcceptLanguage.mockReset();
    usePreferencesStore.setState({
      esiAcceptLanguage: "en",
      appTheme: "default",
    });
  });

  it("uses stored language on mount and updates selection", async () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { esiAcceptLanguage: "de", appTheme: "default" },
        version: 0,
      }),
    );

    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <AppMantineProvider>
        <SettingsCard />
      </AppMantineProvider>,
    );

    await waitFor(() => {
      expect(mockSetAcceptLanguage).toHaveBeenCalledWith("de");
    });

    expect(await screen.findByLabelText("German flag")).toBeInTheDocument();

    const selectedLanguageText = await screen.findByText("German");
    const languageControl = selectedLanguageText.closest("button");

    expect(languageControl).toBeTruthy();

    fireEvent.click(languageControl as HTMLButtonElement);
    fireEvent.click(await screen.findByText("French"));

    const stored = JSON.parse(
      window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}",
    );
    expect(stored.state?.esiAcceptLanguage).toBe("fr");
    expect(mockSetAcceptLanguage).toHaveBeenLastCalledWith("fr");
  });

  it("falls back to english when stored language is invalid", async () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { esiAcceptLanguage: "invalid", appTheme: "default" },
        version: 0,
      }),
    );

    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <AppMantineProvider>
        <SettingsCard />
      </AppMantineProvider>,
    );

    await waitFor(() => {
      expect(mockSetAcceptLanguage).toHaveBeenCalledWith("en");
    });
  });

  it("shows french, japanese, russian and korean language options", async () => {
    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <AppMantineProvider>
        <SettingsCard />
      </AppMantineProvider>,
    );

    const selectedLanguageText = await screen.findByText("English");
    const languageControl = selectedLanguageText.closest("button");

    expect(languageControl).toBeTruthy();

    fireEvent.click(languageControl as HTMLButtonElement);

    expect(await screen.findByText("French")).toBeInTheDocument();
    expect(await screen.findByText("Japanese")).toBeInTheDocument();
    expect(await screen.findByText("Russian")).toBeInTheDocument();
    expect(await screen.findByText("Korean")).toBeInTheDocument();
  });

  it("uses stored theme on mount and updates selection", async () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { esiAcceptLanguage: "en", appTheme: "eve" },
        version: 0,
      }),
    );

    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <AppMantineProvider>
        <SettingsCard />
      </AppMantineProvider>,
    );

    await screen.findByText("EVE");

    const themeControl = screen.getByRole("button", { name: "Theme" });

    fireEvent.click(themeControl);
    fireEvent.click(await screen.findByText("Gallente"));

    const stored = JSON.parse(
      window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}",
    );
    expect(stored.state?.appTheme).toBe("gallente");
    await screen.findByText("Gallente");
  });

  it("falls back to default when stored theme is invalid", async () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { esiAcceptLanguage: "en", appTheme: "invalid" },
        version: 0,
      }),
    );

    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <AppMantineProvider>
        <SettingsCard />
      </AppMantineProvider>,
    );

    await screen.findByText("Default");
  });
});
