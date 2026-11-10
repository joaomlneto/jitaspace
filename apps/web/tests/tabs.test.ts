import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_TYPE_PAGE_TAB,
  isTypePageTab,
  resolveTypePageTab,
  TYPE_PAGE_TABS,
} from "~/app/type/[typeId]/tabs";

describe("type page tabs", () => {
  it.each(TYPE_PAGE_TABS)("recognises %s as a known tab", (tab) => {
    expect(isTypePageTab(tab)).toBe(true);
  });

  it("rejects unknown and nullish values", () => {
    expect(isTypePageTab("bogus")).toBe(false);
    expect(isTypePageTab("")).toBe(false);
    expect(isTypePageTab(null)).toBe(false);
    expect(isTypePageTab(undefined)).toBe(false);
  });

  it("defaults to a valid Overview tab", () => {
    expect(DEFAULT_TYPE_PAGE_TAB).toBe("overview");
    expect(isTypePageTab(DEFAULT_TYPE_PAGE_TAB)).toBe(true);
  });
});

describe("resolveTypePageTab", () => {
  it("keeps a tab the item shows", () => {
    expect(resolveTypePageTab("synchronizer", { synchronizer: true })).toBe(
      "synchronizer",
    );
  });

  it("falls back to the default for a tab the item does not show", () => {
    for (const tab of [
      "combat",
      "insurance",
      "type-lists",
      "synchronizer",
    ] as const) {
      expect(resolveTypePageTab(tab, { [tab]: false })).toBe(
        DEFAULT_TYPE_PAGE_TAB,
      );
    }
  });

  it("keeps a tab every item has", () => {
    expect(resolveTypePageTab("market", { synchronizer: false })).toBe(
      "market",
    );
  });
});
