import { describe, expect, it } from "@jest/globals";

import { entityHistoryHref } from "~/lib/history";

describe("entityHistoryHref", () => {
  it("sends an item to its item page's History tab", () => {
    expect(entityHistoryHref("type", 587)).toBe("/type/587/history");
  });

  it("sends every other kind to its /history page", () => {
    expect(entityHistoryHref("skin", 12)).toBe("/history/skin/12");
    expect(entityHistoryHref("group", 0)).toBe("/history/group/0");
    expect(entityHistoryHref("skinMaterial", 3)).toBe(
      "/history/skinMaterial/3",
    );
  });
});
