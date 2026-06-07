import {
  toArrayIfNot,
  randomProperty,
  removeUndefinedFields,
} from "../src/objects";

describe("toArrayIfNot", () => {
  it("wraps a single value in an array", () => {
    expect(toArrayIfNot(42)).toEqual([42]);
  });

  it("returns the same array when given an array", () => {
    expect(toArrayIfNot([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("wraps a string value", () => {
    expect(toArrayIfNot("hello")).toEqual(["hello"]);
  });

  it("returns an array of strings unchanged", () => {
    expect(toArrayIfNot(["a", "b"])).toEqual(["a", "b"]);
  });

  it("wraps null in an array", () => {
    expect(toArrayIfNot(null)).toEqual([null]);
  });

  it("wraps undefined in an array", () => {
    expect(toArrayIfNot(undefined)).toEqual([undefined]);
  });

  it("returns empty array unchanged", () => {
    expect(toArrayIfNot([])).toEqual([]);
  });

  it("wraps an object in an array", () => {
    const obj = { x: 1 };
    expect(toArrayIfNot(obj)).toEqual([{ x: 1 }]);
  });

  it("preserves a nested array as-is (not double-wrapped)", () => {
    const nested = [[1, 2], [3, 4]];
    expect(toArrayIfNot(nested)).toEqual([[1, 2], [3, 4]]);
  });
});

describe("randomProperty", () => {
  it("returns a value that exists in the object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    for (let i = 0; i < 50; i++) {
      const val = randomProperty(obj);
      expect([1, 2, 3]).toContain(val);
    }
  });

  it("returns the only value for a single-key object", () => {
    expect(randomProperty({ key: "value" })).toBe("value");
  });

  it("returns a string value", () => {
    const obj = { x: "hello", y: "world" };
    const val = randomProperty(obj);
    expect(typeof val).toBe("string");
  });

  it("returns different values over many calls (distribution check)", () => {
    const obj = { a: "a", b: "b", c: "c", d: "d", e: "e" };
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      seen.add(randomProperty(obj));
    }
    // Should see multiple distinct values
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("removeUndefinedFields", () => {
  it("removes keys with undefined values", () => {
    const obj: Record<string, string | undefined> = {
      a: "keep",
      b: undefined,
      c: "also keep",
    };
    const result = removeUndefinedFields(obj);
    expect(result).toEqual({ a: "keep", c: "also keep" });
    expect("b" in result).toBe(false);
  });

  it("leaves object unchanged when no undefined fields exist", () => {
    const obj = { x: 1, y: 2, z: 3 };
    expect(removeUndefinedFields(obj)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("returns an empty object when all fields are undefined", () => {
    const obj: Record<string, undefined> = { a: undefined, b: undefined };
    expect(removeUndefinedFields(obj)).toEqual({});
  });

  it("returns an empty object when input is empty", () => {
    expect(removeUndefinedFields({})).toEqual({});
  });

  it("mutates the original object", () => {
    const obj: Record<string, number | undefined> = { a: 1, b: undefined };
    removeUndefinedFields(obj);
    expect("b" in obj).toBe(false);
  });

  it("preserves null values (does not remove them)", () => {
    const obj: Record<string, null | string> = { a: null, b: "hello" };
    const result = removeUndefinedFields(obj);
    expect(result).toEqual({ a: null, b: "hello" });
  });

  it("preserves falsy non-undefined values", () => {
    const obj: Record<string, number | string | boolean> = {
      zero: 0,
      empty: "",
      falsy: false,
    };
    expect(removeUndefinedFields(obj)).toEqual({
      zero: 0,
      empty: "",
      falsy: false,
    });
  });
});
