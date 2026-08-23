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

  // A number is a pixel dimension, per Mantine — not a key to look up. Reading
  // it as a key made every numeric-size avatar fall through to the 1024 default
  // and request a 1024x1024 image for, say, a 20px menu icon.
  it.each([[20], [24], [30], [64], [128], [0.5]])(
    "reads the numeric size %p as pixels",
    (size) => {
      expect(getAvatarSize({ size, sizes })).toBe(size);
    },
  );

  it("prefers the pixel reading over a same-valued numeric key", () => {
    // `{ 32: 500 }` used to win via the string-coerced `in` lookup. Mantine's
    // `size={32}` means 32 pixels, so the number itself is the answer.
    expect(getAvatarSize({ size: 32, sizes: { 32: 500, 64: 900 } })).toBe(32);
  });

  it.each([
    ["1rem", 16],
    ["1.5rem", 24],
    ["2em", 32],
    ["64px", 64],
    ["20", 20],
    [" 48px ", 48],
  ])("reads the CSS length %p as %p pixels", (size, expected) => {
    expect(getAvatarSize({ size, sizes })).toBe(expected);
  });

  it.each([
    ["auto"],
    ["100%"],
    ["10vw"],
    // CSS has no space between the number and its unit; the tightened pattern
    // no longer accepts one.
    ["48 px"],
    ["1..5rem"],
  ])("returns 1024 for the unreadable value %p", (size) => {
    expect(getAvatarSize({ size, sizes })).toBe(1024);
  });

  // A length we can read but cannot draw must match the numeric branch: Mantine
  // treats size="0" and size={0} alike, so both reach the md fallback rather
  // than one of them falling through to the 1024 over-fetch.
  it.each([["0"], ["0rem"], ["-5px"], ["-2rem"], ["0.0"]])(
    "falls back to the md size for the non-positive length %p",
    (size) => {
      expect(getAvatarSize({ size, sizes })).toBe(32);
    },
  );

  // CSS units are case-insensitive.
  it.each([
    ["16PX", 16],
    ["1REM", 16],
    ["2Em", 32],
    ["1.5Rem", 24],
  ])("reads the upper-case length %p as %p pixels", (size, expected) => {
    expect(getAvatarSize({ size, sizes })).toBe(expected);
  });

  it("treats the falsy numeric size 0 as 'no size' and uses the md fallback", () => {
    // 0 is falsy, so the `!size` guard fires before the pixel reading
    expect(getAvatarSize({ size: 0, sizes })).toBe(32);
  });

  it("treats a negative numeric size as 'no size' and uses the md fallback", () => {
    // A negative dimension would make esiImageSizeClamp produce NaN
    expect(getAvatarSize({ size: -8, sizes })).toBe(32);
  });

  it("treats an empty-string size as 'no size' and uses the md fallback", () => {
    expect(getAvatarSize({ size: "", sizes })).toBe(32);
  });
});
