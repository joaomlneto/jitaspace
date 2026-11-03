import { describe, expect, it } from "@jest/globals";

import { toEffectCategory } from "~/lib/dogmaEffectCategory";

describe("toEffectCategory", () => {
  it("is null for an effect with no category", () => {
    expect(toEffectCategory(null, null)).toBeNull();
  });

  it("keeps CCP's name and ours", () => {
    expect(
      toEffectCategory(5, {
        name: "dgmEffOverload",
        customName: "Overheated",
        customDescription: "An extra bonus while overheated.",
      }),
    ).toEqual({
      effectCategoryId: 5,
      name: "dgmEffOverload",
      customName: "Overheated",
      customDescription: "An extra bonus while overheated.",
    });
  });

  it("drops blank custom text so the page falls back on CCP's name", () => {
    expect(
      toEffectCategory(0, {
        name: "dgmEffPassive",
        customName: "  ",
        customDescription: "",
      }),
    ).toEqual({
      effectCategoryId: 0,
      name: "dgmEffPassive",
      customName: null,
      customDescription: null,
    });
  });

  it("keeps the id when the category row is missing", () => {
    expect(toEffectCategory(9, undefined)).toEqual({
      effectCategoryId: 9,
      name: null,
      customName: null,
      customDescription: null,
    });
  });
});
