import { describe, expect, it } from "@jest/globals";

import { poolSizeFromEnv } from "../lib/dbPoolSize";

describe("poolSizeFromEnv", () => {
  it("leaves the default in place when the variable is unset or empty", () => {
    expect(poolSizeFromEnv(undefined)).toBeUndefined();
    expect(poolSizeFromEnv("")).toBeUndefined();
  });

  it("accepts a validated number and an unvalidated string", () => {
    expect(poolSizeFromEnv(20)).toBe(20);
    expect(poolSizeFromEnv("20")).toBe(20);
  });

  it("ignores values that are not a positive whole number", () => {
    expect(poolSizeFromEnv("abc")).toBeUndefined();
    expect(poolSizeFromEnv("0")).toBeUndefined();
    expect(poolSizeFromEnv(-3)).toBeUndefined();
    expect(poolSizeFromEnv("2.5")).toBeUndefined();
  });
});
