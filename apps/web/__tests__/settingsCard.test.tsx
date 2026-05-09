import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as MantineCore from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { usePreferencesStore } from "~/lib/preferences";

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
    window.localStorage.setItem("jitaspace.esi-accept-language", "de");

    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <MantineCore.MantineProvider>
        <SettingsCard />
      </MantineCore.MantineProvider>,
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

    expect(window.localStorage.getItem("jitaspace.esi-accept-language")).toBe(
      "fr",
    );
    expect(mockSetAcceptLanguage).toHaveBeenLastCalledWith("fr");
  });

  it("falls back to english when stored language is invalid", async () => {
    window.localStorage.setItem("jitaspace.esi-accept-language", "invalid");

    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <MantineCore.MantineProvider>
        <SettingsCard />
      </MantineCore.MantineProvider>,
    );

    await waitFor(() => {
      expect(mockSetAcceptLanguage).toHaveBeenCalledWith("en");
    });
  });

  it("shows french, japanese, russian and korean language options", async () => {
    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <MantineCore.MantineProvider>
        <SettingsCard />
      </MantineCore.MantineProvider>,
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
    window.localStorage.setItem("jitaspace.app-theme", "eve");

    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <MantineCore.MantineProvider>
        <SettingsCard />
      </MantineCore.MantineProvider>,
    );

    await screen.findByText("EVE");

    const themeControl = screen.getByRole("button", { name: "Theme" });

    fireEvent.click(themeControl);
    fireEvent.click(await screen.findByText("Gallente"));

    expect(window.localStorage.getItem("jitaspace.app-theme")).toBe("gallente");
    await screen.findByText("Gallente");
  });

  it("falls back to default when stored theme is invalid", async () => {
    window.localStorage.setItem("jitaspace.app-theme", "invalid");

    const { SettingsCard } = require("~/components/Settings/SettingsCard");

    render(
      <MantineCore.MantineProvider>
        <SettingsCard />
      </MantineCore.MantineProvider>,
    );

    await screen.findByText("Default");
  });
});
