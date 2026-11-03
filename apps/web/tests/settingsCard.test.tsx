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
      appTheme: "minimal",
    });
  });

  it("uses stored language on mount and updates selection", async () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { esiAcceptLanguage: "de", appTheme: "minimal" },
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

    fireEvent.click(languageControl!);
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
        state: { esiAcceptLanguage: "invalid", appTheme: "minimal" },
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

    fireEvent.click(languageControl!);

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

  it("falls back to Default when stored theme is invalid", async () => {
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

  it("renders General and Experimental tabs", () => {
    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <AppMantineProvider>
        <SettingsCard />
      </AppMantineProvider>,
    );

    expect(screen.getByRole("tab", { name: "General" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Experimental" }),
    ).toBeInTheDocument();
  });

  it("chooses the data table engine from the General tab", async () => {
    usePreferencesStore.setState({ dataTableEngine: "tanstack" });

    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <AppMantineProvider>
        <SettingsCard />
      </AppMantineProvider>,
    );

    const control = screen.getByRole("button", { name: "Data tables" });
    expect(control).toHaveTextContent("TanStack");

    fireEvent.click(control);
    fireEvent.click(await screen.findByText("mantine-datatable"));

    expect(usePreferencesStore.getState().dataTableEngine).toBe(
      "mantine-datatable",
    );
    const stored = JSON.parse(
      window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}",
    );
    expect(stored.state?.dataTableEngine).toBe("mantine-datatable");

    // It is no longer an experiment.
    fireEvent.click(screen.getByRole("tab", { name: "Experimental" }));
    expect(screen.queryByText("New data tables")).not.toBeInTheDocument();
  });

  it("turns the Ship Tree debug mode on and off from the Experimental tab", () => {
    usePreferencesStore.setState({ shipTreeDebugMode: false });
    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <AppMantineProvider>
        <SettingsCard />
      </AppMantineProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Experimental" }));
    const toggle = screen.getByRole("switch", { name: "Ship Tree debug mode" });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(usePreferencesStore.getState().shipTreeDebugMode).toBe(true);
    const stored = JSON.parse(
      window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}",
    );
    expect(stored.state?.shipTreeDebugMode).toBe(true);

    fireEvent.click(toggle);
    expect(usePreferencesStore.getState().shipTreeDebugMode).toBe(false);
  });
});
