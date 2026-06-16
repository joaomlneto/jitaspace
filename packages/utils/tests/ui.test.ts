import { getAvatarSize } from "../src/ui";

describe("getAvatarSize", () => {
  const sizes = { xs: 16, sm: 24, md: 32, lg: 48, xl: 64 };

  it("returns the value for a named size present in the map", () => {
    expect(getAvatarSize({ size: "lg", sizes })).toBe(48);
  });

  it("returns the smallest named size when requested", () => {
    expect(getAvatarSize({ size: "xs", sizes })).toBe(16);
  });

  it("falls back to the `md` size when no size is provided", () => {
    expect(getAvatarSize({ size: undefined, sizes })).toBe(32);
  });

  it("falls back to 1024 when no size is provided and `md` is absent", () => {
    const noMd = { sm: 24, lg: 48 };
    expect(getAvatarSize({ size: undefined, sizes: noMd })).toBe(1024);
  });

  it("returns 1024 for an unknown named size", () => {
    expect(getAvatarSize({ size: "enormous", sizes })).toBe(1024);
  });

  it("resolves a numeric size that exists as a key (string-coerced lookup)", () => {
    const numeric = { 32: 500, 64: 900 };
    expect(getAvatarSize({ size: 32, sizes: numeric })).toBe(500);
  });

  it("returns 1024 for a numeric size that is not a key", () => {
    expect(getAvatarSize({ size: 128, sizes })).toBe(1024);
  });

  it("treats the falsy numeric size 0 as 'no size' and uses the md fallback", () => {
    // 0 is falsy, so the `!size` guard fires before the `size in sizes` check
    expect(getAvatarSize({ size: 0, sizes })).toBe(32);
  });

  it("treats an empty-string size as 'no size' and uses the md fallback", () => {
    expect(getAvatarSize({ size: "", sizes })).toBe(32);
  });
});
