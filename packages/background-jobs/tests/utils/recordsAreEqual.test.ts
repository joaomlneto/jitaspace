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
    // Without this, the assertion above passed even when ignoreKeys did
    // nothing, because every pair of Dates used to compare equal.
    expect(recordsAreEqual(a, b)).toBe(false);
  });

  it("returns true for distinct Date objects holding the same instant", () => {
    const a = { id: 1, finishedDate: new Date("2026-08-20T12:00:00Z") };
    const b = { id: 1, finishedDate: new Date("2026-08-20T12:00:00.000Z") };
    expect(recordsAreEqual(a, b)).toBe(true);
  });

  it("returns false for Dates holding different instants", () => {
    const a = { id: 1, finishedDate: new Date("2026-08-20T12:00:00Z") };
    const b = { id: 1, finishedDate: new Date("2026-08-21T12:00:00Z") };
    expect(recordsAreEqual(a, b)).toBe(false);
  });

  it("returns false for Dates a millisecond apart", () => {
    const a = { id: 1, birthday: new Date(1_700_000_000_000) };
    const b = { id: 1, birthday: new Date(1_700_000_000_001) };
    expect(recordsAreEqual(a, b)).toBe(false);
  });

  it("returns false when a Date is compared with a non-Date object", () => {
    const a: { id: number; when: object } = { id: 1, when: new Date(0) };
    const b: { id: number; when: object } = { id: 1, when: {} };
    expect(recordsAreEqual(a, b)).toBe(false);
    expect(recordsAreEqual(b, a)).toBe(false);
  });

  it("treats two Invalid Dates as equal", () => {
    const a = { id: 1, dateFounded: new Date("not a date") };
    const b = { id: 1, dateFounded: new Date("also not a date") };
    expect(recordsAreEqual(a, b)).toBe(true);
  });

  it("compares Dates inside nested objects", () => {
    const a = { id: 1, meta: { seenAt: new Date("2026-01-01T00:00:00Z") } };
    const b = { id: 1, meta: { seenAt: new Date("2026-06-01T00:00:00Z") } };
    expect(recordsAreEqual(a, b)).toBe(false);
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
