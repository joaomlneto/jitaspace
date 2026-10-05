import { describe, expect, it } from "@jest/globals";

import {
  contrastRatio,
  getCorporationPaletteColors,
  getCorporationPaletteWash,
  getCorporationTickerFill,
  getPaletteTint,
  getReadableTextColor,
  tickerNeedsEdge,
} from "~/components/CorporationPalette/corporationPalette";

const DARK_CARD = "#2e2e2e";
const LIGHT_CARD = "#ffffff";
const ALBIREO = ["#0a3db0", "#f6ed0a", "#ed1608"];

describe("getCorporationPaletteColors", () => {
  it("returns no colours for a corporation without a palette", () => {
    expect(getCorporationPaletteColors(undefined)).toEqual([]);
    expect(getCorporationPaletteColors(null)).toEqual([]);
  });

  it("keeps palette order and skips missing colours", () => {
    expect(
      getCorporationPaletteColors({
        main_color: "#0a3db0",
        secondary_color: "#f6ed0a",
        tertiary_color: "#ed1608",
      }),
    ).toEqual(ALBIREO);
    expect(getCorporationPaletteColors({ main_color: "#ffff80" })).toEqual([
      "#ffff80",
    ]);
  });

  it("passes black and white through unchanged", () => {
    expect(
      getCorporationPaletteColors({
        main_color: "#000000",
        secondary_color: "#ffffff",
      }),
    ).toEqual(["#000000", "#ffffff"]);
  });

  it("drops values that are not #rrggbb", () => {
    expect(
      getCorporationPaletteColors({
        main_color: "red",
        secondary_color: "#12345",
        tertiary_color: "#ABCDEF",
      }),
    ).toEqual(["#ABCDEF"]);
  });
});

describe("contrastRatio / getReadableTextColor", () => {
  it("measures WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("picks the text colour with the better worst case across stops", () => {
    expect(getReadableTextColor(["#ffff80"])).toBe("#000000");
    expect(getReadableTextColor(["#0a3db0"])).toBe("#ffffff");
    expect(getReadableTextColor(["#000000", "#ffffff"])).toBe("#ffffff");
  });
});

describe("getPaletteTint", () => {
  it("leaves the surface untouched for colours without a hue", () => {
    expect(getPaletteTint("#000000", DARK_CARD)).toBe(DARK_CARD);
    expect(getPaletteTint("#ffffff", DARK_CARD)).toBe(DARK_CARD);
    expect(getPaletteTint("#000000", LIGHT_CARD)).toBe(LIGHT_CARD);
  });

  it("accepts short theme colours like #fff", () => {
    expect(getPaletteTint("#000000", "#fff")).toBe("#ffffff");
  });

  it("borrows the hue but keeps the surface's lightness", () => {
    const tint = getPaletteTint("#0a3db0", DARK_CARD);
    expect(tint).toBeDefined();
    expect(tint).not.toBe(DARK_CARD);
    // Same lightness, so text contrast on the wash matches the plain card.
    expect(contrastRatio(tint ?? "", DARK_CARD)).toBeLessThan(1.1);
  });

  it("stays a visible tint on a white surface", () => {
    expect(getPaletteTint("#0a3db0", LIGHT_CARD)).not.toBe(LIGHT_CARD);
  });

  it("gives up on unparseable colours", () => {
    expect(getPaletteTint("#0a3db0", "var(--x)")).toBeUndefined();
  });
});

describe("getCorporationPaletteWash", () => {
  it("has no wash without colours or a parseable surface", () => {
    expect(getCorporationPaletteWash([], DARK_CARD)).toBeUndefined();
    expect(
      getCorporationPaletteWash(ALBIREO, "oklch(0.3 0 0)"),
    ).toBeUndefined();
  });

  it("is a flat tint for a single colour", () => {
    expect(getCorporationPaletteWash(["#ffff80"], DARK_CARD)).toMatch(
      /^#[0-9a-f]{6}$/,
    );
  });

  it("is a diagonal OKLab gradient with one evenly spaced stop per colour", () => {
    const wash = getCorporationPaletteWash(ALBIREO, DARK_CARD);
    expect(wash).toMatch(
      /^linear-gradient\(135deg in oklab, #[0-9a-f]{6} 0%, #[0-9a-f]{6} 50%, #[0-9a-f]{6} 100%\)$/,
    );
  });
});

describe("getCorporationTickerFill", () => {
  it("has no fill without a palette", () => {
    expect(getCorporationTickerFill([])).toBeUndefined();
  });

  it("blends the main colour slightly towards the secondary", () => {
    const fill = getCorporationTickerFill(ALBIREO);
    expect(fill?.background).toMatch(
      /^linear-gradient\(135deg in oklab, #0a3db0, #[0-9a-f]{6}\)$/,
    );
    expect(fill?.color).toBe("#ffffff");
  });

  it("falls back to a sheen for a single colour", () => {
    // Dark colours get a lighter top...
    expect(getCorporationTickerFill(["#000000"])).toEqual({
      background: expect.stringMatching(
        /^linear-gradient\(180deg in oklab, #[0-9a-f]{6}, #000000\)$/,
      ),
      color: "#ffffff",
    });
    // ...very light ones a darker bottom, since they cannot get lighter.
    expect(getCorporationTickerFill(["#ffffff"])).toEqual({
      background: expect.stringMatching(
        /^linear-gradient\(180deg in oklab, #ffffff, #[0-9a-f]{6}\)$/,
      ),
      color: "#000000",
    });
  });
});

describe("tickerNeedsEdge", () => {
  it("adds an edge only below 3:1 against the tinted surface", () => {
    expect(tickerNeedsEdge(["#202020"], DARK_CARD)).toBe(true);
    expect(tickerNeedsEdge(["#ffffff"], LIGHT_CARD)).toBe(true);
    expect(tickerNeedsEdge(["#ffff80"], DARK_CARD)).toBe(false);
    expect(tickerNeedsEdge(["#000000"], LIGHT_CARD)).toBe(false);
  });

  it("never needs one without a palette", () => {
    expect(tickerNeedsEdge([], DARK_CARD)).toBe(false);
  });
});
