import { describe, expect, it } from "@jest/globals";

import { stringifyCapped } from "../src/index";

describe("stringifyCapped", () => {
  it("matches JSON.stringify(value, null, 2) when under the cap", () => {
    const value = { a: 1, b: ["x", true, null], c: { d: 2.5, e: [] }, f: {} };
    expect(stringifyCapped(value, 10_000)).toBe(JSON.stringify(value, null, 2));
  });

  it("matches JSON.stringify for primitives and empty containers", () => {
    for (const v of [null, true, false, 0, -5, 2.5, "hi", [], {}]) {
      expect(stringifyCapped(v, 1_000)).toBe(JSON.stringify(v, null, 2));
    }
  });

  it("drops undefined/function object values, like JSON.stringify", () => {
    const value = { keep: 1, drop: undefined, fn: () => 1 };
    expect(stringifyCapped(value, 1_000)).toBe(JSON.stringify(value, null, 2));
  });

  it("truncates huge values with a marker and stays near the cap", () => {
    const big: Record<string, string> = {};
    for (let i = 0; i < 50_000; i++) big[`key_${i}`] = `value number ${i}`;
    const full = JSON.stringify(big, null, 2);
    expect(full.length).toBeGreaterThan(50_000);

    const cap = 5_000;
    const out = stringifyCapped(big, cap);
    expect(out).toContain("… (truncated — use Download for the full file)");
    // Visible JSON is bounded by the cap (plus the short marker), not the full
    // ~1 MB string.
    expect(out.length).toBeLessThan(cap + 100);
    // What it does show is a faithful prefix of the real pretty JSON.
    expect(full.startsWith(out.slice(0, cap - 100))).toBe(true);
  });
});
