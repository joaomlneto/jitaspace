import { fromEveColor } from "../Extensions/EveFont";

describe("fromEveColor", () => {
  describe("9-character EVE color format (0xARRGGBB)", () => {
    // EVE colors are stored as 0x + 1 alpha digit + 6 hex color digits = 9 chars.
    // fromEveColor strips the leading 3 chars (0xA) and prepends '#'.

    it.each([
      ["red", "0x0ff0000", "#ff0000"],
      ["green", "0x000ff00", "#00ff00"],
      ["blue", "0x00000ff", "#0000ff"],
      ["white", "0x0ffffff", "#ffffff"],
      ["black", "0x0000000", "#000000"],
      ["yellow", "0x0ffff00", "#ffff00"],
      ["a mixed color", "0x0a1b2c3", "#a1b2c3"],
      ["lowercase hex digits", "0x0abcdef", "#abcdef"],
      ["uppercase hex digits", "0x0ABCDEF", "#ABCDEF"],
    ])("converts %s", (_name, input, expected) => {
      expect(fromEveColor(input)).toBe(expected);
    });
  });

  describe("non-EVE color inputs (pass-through)", () => {
    it.each([
      ["CSS hex color (7 chars)", "#ff0000", "#ff0000"],
      ["10-char alpha=ff, black (0xff000000)", "0xff000000", "#000000"],
      ["10-char fully opaque red (0xffFF0000)", "0xffFF0000", "#FF0000"],
      ["10-char fully opaque white (0xffFFFFFF)", "0xffFFFFFF", "#FFFFFF"],
      ["10-char semi-transparent white (0xbfffffff)", "0xbfffffff", "#ffffff"],
      ["plain 8-char 0xRRGGBB", "0xff0000", "0xff0000"],
      ["empty string", "", ""],
      ["named color", "red", "red"],
      ["short 3-char string", "abc", "abc"],
    ])("handles %s correctly", (_name, input, expected) => {
      expect(fromEveColor(input)).toBe(expected);
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
