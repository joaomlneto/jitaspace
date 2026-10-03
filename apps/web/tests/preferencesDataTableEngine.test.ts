import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  DEFAULT_DATA_TABLE_ENGINE,
  PREFERENCES_STORAGE_KEY,
  usePreferencesStore,
} from "~/lib/preferences";

const persist = (state: Record<string, unknown>) =>
  localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({ state, version: 0 }),
  );

describe("dataTableEngine preference", () => {
  beforeEach(() => {
    usePreferencesStore.setState({
      dataTableEngine: DEFAULT_DATA_TABLE_ENGINE,
    });
    localStorage.clear();
  });

  afterEach(() => {
    usePreferencesStore.setState({
      dataTableEngine: DEFAULT_DATA_TABLE_ENGINE,
    });
  });

  it("defaults to TanStack", () => {
    expect(usePreferencesStore.getState().dataTableEngine).toBe("tanstack");
  });

  it("updates through the setter", () => {
    usePreferencesStore.getState().setDataTableEngine("mantine-datatable");
    expect(usePreferencesStore.getState().dataTableEngine).toBe(
      "mantine-datatable",
    );
  });

  it("rehydrates a known engine and falls back on an unknown one", async () => {
    persist({ dataTableEngine: "mantine-datatable" });
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().dataTableEngine).toBe(
      "mantine-datatable",
    );

    // The engine that was removed, and anything else unrecognised.
    for (const stale of ["mantine-react-table", 42]) {
      persist({ dataTableEngine: stale });
      await usePreferencesStore.persist.rehydrate();
      expect(usePreferencesStore.getState().dataTableEngine).toBe("tanstack");
    }
  });

  it("ignores the retired experimental switch", async () => {
    // Stored by the old "New data tables" toggle. On or off, every table now
    // renders with the chosen engine, so it must not select anything.
    persist({ experimentalDataTables: true });
    await usePreferencesStore.persist.rehydrate();
    const state = usePreferencesStore.getState() as unknown as Record<
      string,
      unknown
    >;
    expect(state.dataTableEngine).toBe("tanstack");
    expect(state.experimentalDataTables).toBeUndefined();
  });
});
