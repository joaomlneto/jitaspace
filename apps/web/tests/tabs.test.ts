import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_TYPE_PAGE_TAB,
  isTypePageTab,
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
