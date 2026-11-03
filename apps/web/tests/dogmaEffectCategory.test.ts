import { describe, expect, it } from "@jest/globals";

import type { EffectCategories } from "~/lib/dogmaEffectCategory";
import {
  effectCategoryLabel,
  effectCategoryLabelById,
  groupByEffectCategory,
  toEffectCategory,
} from "~/lib/dogmaEffectCategory";

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

const CATEGORIES: EffectCategories = {
  0: {
    effectCategoryId: 0,
    name: "dgmEffPassive",
    customName: "Passive",
    customDescription: null,
  },
  2: {
    effectCategoryId: 2,
    name: "dgmEffTarget",
    customName: null,
    customDescription: null,
  },
};

describe("effectCategoryLabel", () => {
  it("prefers our name, then CCP's without the prefix, then the id", () => {
    expect(effectCategoryLabel(CATEGORIES[0]!)).toBe("Passive");
    expect(effectCategoryLabel(CATEGORIES[2]!)).toBe("Target");
    expect(
      effectCategoryLabel({
        effectCategoryId: 9,
        name: null,
        customName: null,
      }),
    ).toBe("Category 9");
  });
});

describe("effectCategoryLabelById", () => {
  it("labels a known id, falls back for an unknown one, and is null for none", () => {
    expect(effectCategoryLabelById(CATEGORIES, 0)).toBe("Passive");
    expect(effectCategoryLabelById(CATEGORIES, 7)).toBe("Category 7");
    expect(effectCategoryLabelById(CATEGORIES, null)).toBeNull();
    expect(effectCategoryLabelById(CATEGORIES, undefined)).toBeNull();
  });
});

describe("groupByEffectCategory", () => {
  it("groups in category-id order, keeps item order, and puts unknown last", () => {
    const items = [
      { id: "a", category: 2 },
      { id: "b", category: null },
      { id: "c", category: 0 },
      { id: "d", category: 2 },
      { id: "e", category: 7 },
    ];
    const groups = groupByEffectCategory(
      items,
      (item) => item.category,
      CATEGORIES,
    );
    expect(
      groups.map((group) => [
        group.category?.effectCategoryId ?? null,
        group.items.map((item) => item.id),
      ]),
    ).toEqual([
      [0, ["c"]],
      [2, ["a", "d"]],
      [7, ["e"]],
      [null, ["b"]],
    ]);
    // A category id with no row still gets a group, named by its id.
    expect(groups[2]?.category).toEqual({
      effectCategoryId: 7,
      name: null,
      customName: null,
      customDescription: null,
    });
  });

  it("returns no groups for no items", () => {
    expect(groupByEffectCategory([], () => 0, CATEGORIES)).toEqual([]);
  });
});
