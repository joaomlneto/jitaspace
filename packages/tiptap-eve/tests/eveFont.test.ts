import { fromEveColor } from "../Extensions/EveFont";

describe("fromEveColor", () => {
  describe("9-character EVE color format (0x0RRGGBB)", () => {
    // EVE colors are stored as 0x + 1 alpha digit + 6 hex color digits = 9 chars.
    // fromEveColor strips the leading 3 chars (0x0) and prepends '#'.

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

  describe("10-character EVE color format (0xAARRGGBB)", () => {
    it.each([
      ["alpha=ff, black (0xff000000)", "0xff000000", "#000000"],
      ["fully opaque red (0xffFF0000)", "0xffFF0000", "#FF0000"],
      ["fully opaque white (0xffFFFFFF)", "0xffFFFFFF", "#FFFFFF"],
      ["semi-transparent white (0xbfffffff)", "0xbfffffff", "#ffffff"],
    ])("converts %s", (_name, input, expected) => {
      expect(fromEveColor(input)).toBe(expected);
    });
  });

  describe("plain CSS hex colors (pass-through)", () => {
    it.each([
      ["6-char hex", "#ff0000", "#ff0000"],
      ["3-char shorthand hex", "#abc", "#abc"],
      ["6-char hex (aabbcc)", "#aabbcc", "#aabbcc"],
      ["8-char hex with alpha", "#aabbccdd", "#aabbccdd"],
    ])("passes through %s", (_name, input, expected) => {
      expect(fromEveColor(input)).toBe(expected);
    });
  });

  describe("missing color attribute (TipTap default)", () => {
    // A <font> tag without a `color` attribute (e.g. `<font size="14">` headers,
    // ubiquitous in EVE descriptions/mail) renders with the mark's default,
    // which TipTap resolves to `null`. fromEveColor must not throw on this — it
    // used to read `.length` and crash the whole MailMessageViewer.
    it.each([
      ["empty string", ""],
      ["null", null],
      ["undefined", undefined],
    ])("returns an empty string for %s", (_name, input) => {
      expect(fromEveColor(input)).toBe("");
    });
  });

  describe("rejects CSS-injection / invalid inputs (returns empty string)", () => {
    // `color` is attacker-controlled (other players' mail bodies, character
    // bios). Any value that is not a recognized EVE color or plain hex color
    // must resolve to "" so it can never be interpolated into a `color:` CSS
    // declaration — otherwise the value could break out of the declaration and
    // inject arbitrary page-wide styling or a tracking beacon.
    it.each([
      ["CSS breakout via named color", "blue;position:fixed;background:url(x)"],
      [
        "CSS breakout via hex color",
        "#ff0000;position:fixed;inset:0;z-index:99999",
      ],
      ["full overlay payload", "red;position:fixed;inset:0;background:url(y)"],
      ["named color", "red"],
      ["short non-hex string", "abc"],
      ["javascript pseudo-url", "javascript:alert(1)"],
      ["url() value", "url(https://attacker/beacon)"],
      ["plain 8-char 0xRRGGBB (no alpha, ambiguous)", "0xff0000"],
      ["hex with too many digits", "#0123456789"],
      ["hex with non-hex char", "#gggggg"],
      ["9-char without 0x prefix", "abcdefghi"],
    ])("returns an empty string for %s", (_name, input) => {
      expect(fromEveColor(input)).toBe("");
    });
  });

  describe("inline style integration", () => {
    // Verify the output format matches what renderHTML uses:
    // `color:${fromEveColor(color)}`

    it("produces a valid CSS color for inline style", () => {
      const color = fromEveColor("0x0ff0000");
      const style = `font-size:12pt;color:${color}`;
      expect(style).toBe("font-size:12pt;color:#ff0000");
    });

    it("uses the original value when it is already a plain hex color", () => {
      const color = fromEveColor("#ff0000");
      const style = `font-size:10pt;color:${color}`;
      expect(style).toBe("font-size:10pt;color:#ff0000");
    });
  });
});
