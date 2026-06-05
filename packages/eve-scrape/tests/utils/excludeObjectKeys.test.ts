import { describe, expect, it } from "@jest/globals";

import { excludeObjectKeys } from "../../utils/excludeObjectKeys";

describe("excludeObjectKeys", () => {
  it("removes the specified keys and returns the rest", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = excludeObjectKeys(obj, ["b"]);
    expect(result).toEqual({ a: 1, c: 3 });
    expect(result).not.toHaveProperty("b");
  });

  it("handles an empty keys array (returns full object)", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = excludeObjectKeys(obj, []);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("handles all keys being removed (returns empty object)", () => {
    const obj = { a: 1, b: 2 };
    const result = excludeObjectKeys(obj, ["a", "b"]);
    expect(result).toEqual({});
  });

  it("does not mutate the original object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const original = { ...obj };
    excludeObjectKeys(obj, ["b"]);
    expect(obj).toEqual(original);
  });
});
