import "@testing-library/jest-dom/jest-globals";

import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";

import {
  PREFERENCES_STORAGE_KEY,
  setStoredEsiAcceptLanguage,
  usePreferencesStore,
} from "~/lib/preferences";

const mockSetAcceptLanguage = jest.fn<(value?: string) => void>();
const mockSetUserAgent = jest.fn<(value?: string) => void>();

jest.mock("@jitaspace/esi-client", () => ({
  setAcceptLanguage: (...args: [string | undefined]) =>
    mockSetAcceptLanguage(...args),
  setUserAgent: (...args: [string | undefined]) => mockSetUserAgent(...args),
}));

jest.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));

jest.mock("@tanstack/react-query-next-experimental", () => ({
  ReactQueryStreamedHydration: ({ children }: PropsWithChildren) => children,
}));

describe("MyQueryClientProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSetAcceptLanguage.mockReset();
    mockSetUserAgent.mockReset();

    usePreferencesStore.setState({
      esiAcceptLanguage: "en",
      appTheme: "default",
    });
  });

  it("invalidates all queries when language is changed", async () => {
    const invalidateQueriesSpy = jest
      .spyOn(QueryClient.prototype, "invalidateQueries")
      .mockResolvedValue(undefined);

    const { MyQueryClientProvider } = require("~/lib/MyQueryClientProvider");

    render(
      <MyQueryClientProvider esiAcceptLanguage="en">
        <div>content</div>
      </MyQueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockSetAcceptLanguage).toHaveBeenCalledWith("en");
    });

    act(() => {
      setStoredEsiAcceptLanguage("fr");
    });

    await waitFor(() => {
      expect(mockSetAcceptLanguage).toHaveBeenLastCalledWith("fr");
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ refetchType: "all" });

    invalidateQueriesSpy.mockRestore();
  });

  it("falls back to default language when stored value is invalid", async () => {
    const invalidateQueriesSpy = jest
      .spyOn(QueryClient.prototype, "invalidateQueries")
      .mockResolvedValue(undefined);

    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { esiAcceptLanguage: "not-a-language", appTheme: "default" },
        version: 0,
      }),
    );

    const { MyQueryClientProvider } = require("~/lib/MyQueryClientProvider");

    render(
      <MyQueryClientProvider esiAcceptLanguage="en">
        <div>content</div>
      </MyQueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockSetAcceptLanguage).toHaveBeenCalledWith("en");
    });

    expect(usePreferencesStore.getState().esiAcceptLanguage).toBe("en");
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();

    invalidateQueriesSpy.mockRestore();
  });
});
