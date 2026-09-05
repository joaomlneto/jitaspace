import { describe, expect, it } from "@jest/globals";

import { firstNonEmpty } from "~/lib/strings";

describe("firstNonEmpty", () => {
  it("returns the first value that has text", () => {
    expect(firstNonEmpty("Power Output", "powerOutput")).toBe("Power Output");
  });

  it("falls through null and undefined", () => {
    expect(firstNonEmpty(null, undefined, "powerOutput")).toBe("powerOutput");
  });

  it("falls through a present-but-blank value, which `??` would not", () => {
    expect(firstNonEmpty("", "powerOutput")).toBe("powerOutput");
    expect(firstNonEmpty("   ", "powerOutput")).toBe("powerOutput");
    expect(firstNonEmpty("\n\t ", "powerOutput")).toBe("powerOutput");
  });

  it("trims the value it returns", () => {
    expect(firstNonEmpty("  Power Output  ")).toBe("Power Output");
  });

  it("returns undefined when nothing has text", () => {
    expect(firstNonEmpty()).toBeUndefined();
    expect(firstNonEmpty(null, undefined)).toBeUndefined();
    expect(firstNonEmpty("", "   ", null)).toBeUndefined();
  });

  it("keeps a value that is only meaningful after trimming", () => {
    expect(firstNonEmpty(" 0 ")).toBe("0");
  });
});
