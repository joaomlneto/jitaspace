import { describe, expect, it } from "@jest/globals";
import Decimal from "decimal.js";

import { recordsAreEqual } from "../../utils/recordsAreEqual";

describe("recordsAreEqual", () => {
  it("returns true for identical flat objects", () => {
    const a = { id: 1, name: "foo", count: 42 };
    const b = { id: 1, name: "foo", count: 42 };
    expect(recordsAreEqual(a, b)).toBe(true);
  });

  it("returns false when a primitive field differs", () => {
    const a = { id: 1, name: "foo" };
    const b = { id: 1, name: "bar" };
    expect(recordsAreEqual(a, b)).toBe(false);
  });

  it("handles null values: both null -> true", () => {
    const a = { id: 1, value: null };
    const b = { id: 1, value: null };
    expect(recordsAreEqual(a, b)).toBe(true);
  });

  it("handles null values: one null -> false", () => {
    const a: { id: number; value: string | null } = { id: 1, value: null };
    const b: { id: number; value: string | null } = {
      id: 1,
      value: "something",
    };
    expect(recordsAreEqual(a, b)).toBe(false);
  });

  it("handles nested objects recursively", () => {
    const a = { id: 1, meta: { level: 2, tag: "x" } };
    const b = { id: 1, meta: { level: 2, tag: "x" } };
    expect(recordsAreEqual(a, b)).toBe(true);
  });

  it("returns false for different nested objects", () => {
    const a = { id: 1, meta: { level: 2 } };
    const b = { id: 1, meta: { level: 3 } };
    expect(recordsAreEqual(a, b)).toBe(false);
  });

  it("respects the ignoreKeys option (ignores the listed key even if it differs)", () => {
    const a = { id: 1, updatedAt: new Date("2020-01-01"), name: "foo" };
    const b = { id: 1, updatedAt: new Date("2023-12-31"), name: "foo" };
    expect(recordsAreEqual(a, b, { ignoreKeys: ["updatedAt"] })).toBe(true);
  });

  it("Compares Decimal.js values correctly: equal amounts -> true", () => {
    const a = { price: new Decimal("1.23456789") };
    const b = { price: new Decimal("1.23456789") };
    expect(recordsAreEqual(a, b)).toBe(true);
  });

  it("Compares Decimal.js values correctly: different amounts -> false", () => {
    const a = { price: new Decimal("1.23") };
    const b = { price: new Decimal("4.56") };
    expect(recordsAreEqual(a, b)).toBe(false);
  });

  it("handles float comparisons via string representation", () => {
    const a = { ratio: 0.1 + 0.2 };
    const b = { ratio: 0.1 + 0.2 };
    expect(recordsAreEqual(a, b)).toBe(true);
  });

  it("returns false for floats with different string representations", () => {
    const a = { ratio: 1.1 };
    const b = { ratio: 1.2 };
    expect(recordsAreEqual(a, b)).toBe(false);
  });
});
