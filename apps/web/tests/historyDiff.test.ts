import { describe, expect, it } from "@jest/globals";

import {
  arrayKeyOf,
  deepEqual,
  diffLeaves,
  enumerateLeaves,
  isPlainObject,
  keyLabel,
  restSummary,
  sdeLabel,
  summarize,
} from "~/app/history/_diff";

describe("isPlainObject", () => {
  it("recognises plain objects only", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(5)).toBe(false);
    expect(isPlainObject("x")).toBe(false);
  });
});

describe("arrayKeyOf", () => {
  it("finds the shared id field of an array of records", () => {
    expect(arrayKeyOf([{ attributeID: 1, value: 2 }])).toBe("attributeID");
    expect(arrayKeyOf([{ typeID: 9 }, { typeID: 10 }])).toBe("typeID");
  });
  it("returns null for empty, primitive, or keyless arrays", () => {
    expect(arrayKeyOf([])).toBeNull();
    expect(arrayKeyOf([1, 2, 3])).toBeNull();
    expect(arrayKeyOf([{ foo: 1 }])).toBeNull();
    expect(arrayKeyOf([{ attributeID: 1 }, { value: 2 }])).toBeNull();
  });
});

describe("keyLabel", () => {
  it("stringifies primitives directly and formats objects", () => {
    expect(keyLabel(5)).toBe("5");
    expect(keyLabel("abc")).toBe("abc");
    expect(keyLabel({ en: "Hi" })).toBe("Hi");
  });
});

describe("restSummary", () => {
  it("returns the lone value when one field remains", () => {
    expect(restSummary({ attributeID: 1, value: 42 }, "attributeID")).toBe("42");
  });
  it("joins remaining fields as key: value", () => {
    expect(restSummary({ id: 1, a: 2, b: 3 }, "id")).toBe("a: 2, b: 3");
  });
});

describe("summarize", () => {
  it("counts array entries (singular / plural) and formats scalars", () => {
    expect(summarize([1, 2, 3])).toBe("3 entries");
    expect(summarize([1])).toBe("1 entry");
    expect(summarize(7)).toBe("7");
  });
});

describe("sdeLabel", () => {
  it("prefers displayName.en, then string name, then name.en, then nameID.en", () => {
    expect(sdeLabel({ displayName: { en: "Display" }, name: "n" })).toBe(
      "Display",
    );
    expect(sdeLabel({ name: "Plain" })).toBe("Plain");
    expect(sdeLabel({ name: { en: "Localized" } })).toBe("Localized");
    expect(sdeLabel({ nameID: { en: "ViaNameId" } })).toBe("ViaNameId");
  });
  it("returns undefined for missing / blank labels", () => {
    expect(sdeLabel(undefined)).toBeUndefined();
    expect(sdeLabel({})).toBeUndefined();
    expect(sdeLabel({ name: "   " })).toBeUndefined();
  });
});

describe("deepEqual", () => {
  it("compares by JSON value", () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual([1, 2], [1, 2])).toBe(true);
  });
});

describe("enumerateLeaves", () => {
  it("flattens nested objects into per-scalar leaves", () => {
    const leaves = enumerateLeaves({ a: 1, b: { c: 2 } }, ["root"], "added");
    expect(leaves).toEqual([
      { path: ["root", "a"], kind: "added", to: 1 },
      { path: ["root", "b", "c"], kind: "added", to: 2 },
    ]);
  });
  it("keys arrays of records by their id field", () => {
    const leaves = enumerateLeaves(
      [{ attributeID: 3, value: 9 }],
      [],
      "removed",
    );
    expect(leaves).toEqual([
      { path: ["3", "attributeID"], kind: "removed", from: 3 },
      { path: ["3", "value"], kind: "removed", from: 9 },
    ]);
  });
  it("indexes positional arrays of primitives", () => {
    expect(enumerateLeaves(["x", "y"], ["p"], "added")).toEqual([
      { path: ["p", "[0]"], kind: "added", to: "x" },
      { path: ["p", "[1]"], kind: "added", to: "y" },
    ]);
  });
});

describe("diffLeaves", () => {
  it("returns nothing for equal scalars and a changed leaf otherwise", () => {
    expect(diffLeaves(1, 1)).toEqual([]);
    expect(diffLeaves(1, 2)).toEqual([
      { path: [], kind: "changed", from: 1, to: 2 },
    ]);
  });

  it("diffs plain objects key by key (added / removed / changed)", () => {
    const leaves = diffLeaves({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 });
    expect(leaves).toContainEqual({
      path: ["b"],
      kind: "changed",
      from: 2,
      to: 3,
    });
    expect(leaves).toContainEqual({ path: ["c"], kind: "added", to: 4 });
    // 'a' is unchanged so should NOT appear
    expect(leaves.find((l) => l.path[0] === "a")).toBeUndefined();
  });

  it("removes a key that disappears", () => {
    expect(diffLeaves({ a: 1, b: 2 }, { a: 1 })).toEqual([
      { path: ["b"], kind: "removed", from: 2 },
    ]);
  });

  it("diffs arrays of records by their shared id (stable across reorder)", () => {
    const from = [
      { attributeID: 1, value: 10 },
      { attributeID: 2, value: 20 },
    ];
    const to = [
      { attributeID: 2, value: 20 }, // reordered, unchanged
      { attributeID: 1, value: 11 }, // changed
      { attributeID: 3, value: 30 }, // added
    ];
    const leaves = diffLeaves(from, to);
    expect(leaves).toContainEqual({
      path: ["1", "value"],
      kind: "changed",
      from: 10,
      to: 11,
    });
    expect(leaves).toContainEqual({ path: ["3", "value"], kind: "added", to: 30 });
    // attributeID 2 unchanged → no leaf
    expect(leaves.some((l) => l.path[0] === "2")).toBe(false);
  });

  it("removes a record that disappears from a keyed array", () => {
    const leaves = diffLeaves(
      [{ attributeID: 1, value: 1 }],
      [{ attributeID: 2, value: 2 }],
    );
    expect(leaves).toContainEqual({
      path: ["1", "attributeID"],
      kind: "removed",
      from: 1,
    });
    expect(leaves).toContainEqual({
      path: ["2", "attributeID"],
      kind: "added",
      to: 2,
    });
  });

  it("set-diffs arrays of primitives and ignores pure reorders", () => {
    expect(diffLeaves([1, 2, 3], [3, 1, 2])).toEqual([]);
    const leaves = diffLeaves([1, 2], [2, 3]);
    expect(leaves).toContainEqual({ path: [], kind: "removed", from: "1" });
    expect(leaves).toContainEqual({ path: [], kind: "added", to: "3" });
  });

  it("diffs positional / mixed arrays element by element", () => {
    const leaves = diffLeaves([{ x: 1 }, 5], [{ x: 2 }]);
    expect(leaves).toContainEqual({
      path: ["[0]", "x"],
      kind: "changed",
      from: 1,
      to: 2,
    });
    expect(leaves).toContainEqual({ path: ["[1]"], kind: "removed", from: 5 });
  });

  it("recurses into nested objects with path labels", () => {
    const leaves = diffLeaves({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } });
    expect(leaves).toEqual([
      { path: ["a", "b", "c"], kind: "changed", from: 1, to: 2 },
    ]);
  });
});
