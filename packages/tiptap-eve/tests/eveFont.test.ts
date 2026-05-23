import { fromEveColor } from "../Extensions/EveFont";

describe("fromEveColor", () => {
  describe("9-character EVE color format (0xARRGGBB)", () => {
    // EVE colors are stored as 0x + 1 alpha digit + 6 hex color digits = 9 chars.
    // fromEveColor strips the leading 3 chars (0xA) and prepends '#'.

    it("converts red", () => {
      expect(fromEveColor("0x0ff0000")).toBe("#ff0000");
    });

    it("converts green", () => {
      expect(fromEveColor("0x000ff00")).toBe("#00ff00");
    });

    it("converts blue", () => {
      expect(fromEveColor("0x00000ff")).toBe("#0000ff");
    });

    it("converts white", () => {
      expect(fromEveColor("0x0ffffff")).toBe("#ffffff");
    });

    it("converts black", () => {
      expect(fromEveColor("0x0000000")).toBe("#000000");
    });

    it("converts yellow", () => {
      expect(fromEveColor("0x0ffff00")).toBe("#ffff00");
    });

    it("converts a mixed color", () => {
      expect(fromEveColor("0x0a1b2c3")).toBe("#a1b2c3");
    });

    it("preserves lowercase hex digits", () => {
      expect(fromEveColor("0x0abcdef")).toBe("#abcdef");
    });

    it("preserves uppercase hex digits", () => {
      expect(fromEveColor("0x0ABCDEF")).toBe("#ABCDEF");
    });
  });

  describe("non-EVE color inputs (pass-through)", () => {
    it("returns a CSS hex color unchanged (7 chars)", () => {
      expect(fromEveColor("#ff0000")).toBe("#ff0000");
    });

    it("converts 10-char 0xAARRGGBB EVE color (alpha=ff, black)", () => {
      // 0x + ff (alpha) + 000000 (R=G=B=0) → #000000
      expect(fromEveColor("0xff000000")).toBe("#000000");
    });

    it("converts 10-char 0xffFF0000 (fully opaque red)", () => {
      // 0x + ff (alpha) + FF0000 (red) → #FF0000
      expect(fromEveColor("0xffFF0000")).toBe("#FF0000");
    });

    it("converts 10-char 0xffFFFFFF (fully opaque white)", () => {
      // 0x + ff (alpha) + FFFFFF (white) → #FFFFFF
      expect(fromEveColor("0xffFFFFFF")).toBe("#FFFFFF");
    });

    it("converts 10-char 0xbfffffff (semi-transparent white)", () => {
      // 0x + bf (alpha) + ffffff (white) → #ffffff
      expect(fromEveColor("0xbfffffff")).toBe("#ffffff");
    });

    it("returns a plain 8-char 0x color unchanged (0xRRGGBB)", () => {
      expect(fromEveColor("0xff0000")).toBe("0xff0000");
    });

    it("returns an empty string unchanged", () => {
      expect(fromEveColor("")).toBe("");
    });

    it("returns a named color unchanged", () => {
      expect(fromEveColor("red")).toBe("red");
    });

    it("returns a short 3-char string unchanged", () => {
      expect(fromEveColor("abc")).toBe("abc");
    });
  });

  describe("inline style integration", () => {
    // Verify the output format matches what renderHTML uses:
    // `font-size:${size}pt;color:${fromEveColor(color)}`

    it("produces a valid CSS color for inline style", () => {
      const color = fromEveColor("0x0ff0000");
      const style = `font-size:12pt;color:${color}`;
      expect(style).toBe("font-size:12pt;color:#ff0000");
    });

    it("uses the original value when no conversion applies", () => {
      const color = fromEveColor("#ff0000");
      const style = `font-size:10pt;color:${color}`;
      expect(style).toBe("font-size:10pt;color:#ff0000");
    });
  });
});
