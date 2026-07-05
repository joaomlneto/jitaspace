import { describe, expect, it } from "@jest/globals";

import { sanitizeReturnTo } from "../lib/returnTo";

describe("sanitizeReturnTo", () => {
  it("passes through safe same-site relative paths", () => {
    expect(sanitizeReturnTo("/")).toBe("/");
    expect(sanitizeReturnTo("/skills?x=1")).toBe("/skills?x=1");
  });

  it("falls back to / for nullish or empty input", () => {
    expect(sanitizeReturnTo(null)).toBe("/");
    expect(sanitizeReturnTo(undefined)).toBe("/");
    expect(sanitizeReturnTo("")).toBe("/");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(sanitizeReturnTo("//evil.com")).toBe("/");
    expect(sanitizeReturnTo("https://evil.com")).toBe("/");
  });

  it("rejects backslash and control-char paths that normalise cross-origin", () => {
    expect(sanitizeReturnTo("/\\evil.com")).toBe("/");
    expect(sanitizeReturnTo("/\\@evil.com")).toBe("/");
    expect(sanitizeReturnTo("/\t/evil.com")).toBe("/");
  });

  it("keeps the sanitised result same-origin when parsed by the real URL parser", () => {
    const origin = "https://www.jita.space";
    for (const input of ["/\\evil.com", "/\\@evil.com", "/\t/evil.com"]) {
      expect(new URL(sanitizeReturnTo(input), origin).origin).toBe(origin);
    }
  });
});
