import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  PREFERENCES_STORAGE_KEY,
  usePreferencesStore,
} from "~/lib/preferences";

const persist = (state: Record<string, unknown>) =>
  localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({ state, version: 0 }),
  );

describe("shipTreeDebugMode preference", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ shipTreeDebugMode: false });
    localStorage.clear();
  });

  afterEach(() => {
    usePreferencesStore.setState({ shipTreeDebugMode: false });
  });

  it("is off by default", () => {
    expect(usePreferencesStore.getState().shipTreeDebugMode).toBe(false);
  });

  it("updates through the setter", () => {
    usePreferencesStore.getState().setShipTreeDebugMode(true);
    expect(usePreferencesStore.getState().shipTreeDebugMode).toBe(true);
  });

  it("rehydrates only a stored true as on", async () => {
    persist({ shipTreeDebugMode: true });
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().shipTreeDebugMode).toBe(true);

    for (const stale of ["true", 1, null]) {
      persist({ shipTreeDebugMode: stale });
      await usePreferencesStore.persist.rehydrate();
      expect(usePreferencesStore.getState().shipTreeDebugMode).toBe(false);
    }

    persist({});
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().shipTreeDebugMode).toBe(false);
  });
});
