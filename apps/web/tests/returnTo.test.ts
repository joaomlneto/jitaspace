import { describe, expect, it } from "@jest/globals";

import { sanitizeReturnTo } from "../lib/returnTo";

// Built via char codes so the source stays unambiguous — no raw control
// characters or hard-to-spot backslash escapes in the test literals.
const BACKSLASH = String.fromCharCode(0x5c); // "\"
const TAB = String.fromCharCode(0x09);
const NEWLINE = String.fromCharCode(0x0a);
const NUL = String.fromCharCode(0x00);

describe("sanitizeReturnTo", () => {
  it("keeps same-origin relative paths, preserving query and hash", () => {
    expect(sanitizeReturnTo("/mail?x=1#y")).toBe("/mail?x=1#y");
    expect(sanitizeReturnTo("/skills")).toBe("/skills");
    expect(sanitizeReturnTo("/lp-store?corp=1")).toBe("/lp-store?corp=1");
  });

  it("defaults to / for empty, null, or undefined values", () => {
    expect(sanitizeReturnTo(null)).toBe("/");
    expect(sanitizeReturnTo(undefined)).toBe("/");
    expect(sanitizeReturnTo("")).toBe("/");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(sanitizeReturnTo("https://evil.com")).toBe("/");
    expect(sanitizeReturnTo("//evil.com")).toBe("/");
  });

  it("rejects backslash paths the WHATWG URL parser normalises off-origin", () => {
    // The parser reads "\" as "/", so `/\evil.com` resolves to https://evil.com/
    // — the open-redirect bypass this guard closes.
    expect(sanitizeReturnTo("/" + BACKSLASH + "evil.com")).toBe("/");
    expect(sanitizeReturnTo("/" + BACKSLASH + "/evil.com")).toBe("/");
  });

  it("rejects values containing control characters browsers would strip", () => {
    expect(sanitizeReturnTo("/" + TAB + "evil.com")).toBe("/");
    expect(sanitizeReturnTo("/" + NEWLINE + "evil.com")).toBe("/");
    expect(sanitizeReturnTo("/foo" + NUL)).toBe("/");
  });

  it("falls back to / when the value cannot be parsed as a URL", () => {
    expect(sanitizeReturnTo("http://")).toBe("/");
  });
});
