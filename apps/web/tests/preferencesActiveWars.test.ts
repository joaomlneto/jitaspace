import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  DEFAULT_EXPERIMENTAL_ACTIVE_WARS,
  usePreferencesStore,
} from "~/lib/preferences";

describe("experimentalActiveWars preference", () => {
  beforeEach(() => {
    usePreferencesStore.setState({
      experimentalActiveWars: DEFAULT_EXPERIMENTAL_ACTIVE_WARS,
    });
    localStorage.clear();
  });

  afterEach(() => {
    usePreferencesStore.setState({ experimentalActiveWars: false });
  });

  it("defaults to off", () => {
    expect(DEFAULT_EXPERIMENTAL_ACTIVE_WARS).toBe(false);
    expect(usePreferencesStore.getState().experimentalActiveWars).toBe(false);
  });

  it("updates through the setter", () => {
    usePreferencesStore.getState().setExperimentalActiveWars(true);
    expect(usePreferencesStore.getState().experimentalActiveWars).toBe(true);
  });

  it("rehydrates a valid persisted value and falls back on an invalid one", async () => {
    localStorage.setItem(
      "jitaspace.preferences",
      JSON.stringify({ state: { experimentalActiveWars: true }, version: 0 }),
    );
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().experimentalActiveWars).toBe(true);

    localStorage.setItem(
      "jitaspace.preferences",
      JSON.stringify({
        state: { experimentalActiveWars: "yes-please" },
        version: 0,
      }),
    );
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().experimentalActiveWars).toBe(false);
  });
});
