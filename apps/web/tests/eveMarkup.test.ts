import { describe, expect, it } from "@jest/globals";

import { stripEveMarkup } from "~/lib/eveMarkup";

describe("stripEveMarkup", () => {
  it("drops EVE's tags and keeps the text", () => {
    expect(
      stripEveMarkup('<font size="12" color="#ff00ff00">Director</font>'),
    ).toBe("Director");
  });

  it("keeps a line break as a space and collapses whitespace", () => {
    expect(stripEveMarkup("Line one.<br>Line  two.<br/>\n Three")).toBe(
      "Line one. Line two. Three",
    );
  });

  it("cannot reassemble a tag from nested fragments", () => {
    // A single regex pass removes only the inner tag and leaves `<script>`.
    const cases: [string, string][] = [
      ["<scr<b>ipt>alert(1)</scr<b>ipt>", "ipt>alert(1)ipt>"],
      ["<<script>script>alert(1)", "script>alert(1)"],
      ["<<b>script>alert(1)", "script>alert(1)"],
      ["<</b>/script>", "/script>"],
      ["a <b unterminated", "a"],
    ];
    for (const [input, expected] of cases) {
      const result = stripEveMarkup(input);
      expect(result).toBe(expected);
      // HTML opens a tag only on `<` plus one of these.
      expect(result).not.toMatch(/<[\p{L}/!?]/u);
    }
  });

  // Shapes found in production character titles (2026-11-08): EVE cuts a
  // title off at about 100 characters, often inside a tag.
  it("drops a tag that never closes", () => {
    expect(stripEveMarkup("<color=0xffE50000>Drone Master</color")).toBe(
      "Drone Master",
    );
    expect(stripEveMarkup("<color=green> Engineering team<")).toBe(
      "Engineering team",
    );
    expect(stripEveMarkup("<b>CEO</b> <color=0x")).toBe("CEO");
    expect(
      stripEveMarkup("<color=0xFF8B0000>Witch </color<color=0xEF000000>Annis"),
    ).toBe("Witch Annis");
  });

  it("hides malformed tags as the old regex did", () => {
    expect(
      stripEveMarkup("<b><color=0xfff90082>PhD in Logistics<\\color><\\b>"),
    ).toBe("PhD in Logistics");
    expect(stripEveMarkup("<0xFFFF0000>Director</color>")).toBe("Director");
    expect(stripEveMarkup('<color="Red"><"b">Pirate</Red></b> ')).toBe(
      "Pirate",
    );
    expect(stripEveMarkup('< size="29"> 6666 </size>')).toBe("6666");
    expect(stripEveMarkup("<Босс")).toBe("");
  });

  it("keeps a `<` that cannot open a tag as text", () => {
    expect(stripEveMarkup("CEO <3")).toBe("CEO <3");
    expect(stripEveMarkup("CEO < Director")).toBe("CEO < Director");
    expect(stripEveMarkup("-> Logistics <-")).toBe("-> Logistics <-");
    expect(stripEveMarkup(">> sexy <<")).toBe(">> sexy <");
    expect(stripEveMarkup("1 < 2 <b>bold</b>")).toBe("1 < 2 bold");
    // `<Director>` is tag-shaped, so it goes, as it did under the old regex.
    expect(stripEveMarkup("<<Director>>")).toBe("<>");
  });

  it("strips the tags EVE titles carry, as the regex it replaced did", () => {
    const cases: [string, string][] = [
      [
        '<font size="12" color="#bfffffff">Fleet <b>Commander</b></font>',
        "Fleet Commander",
      ],
      ['<a href="showinfo:2//98000001">Corp</a> Liaison', "Corp Liaison"],
      ["<url=http://example.com>Recruiter</url>", "Recruiter"],
    ];
    for (const [input, expected] of cases) {
      expect(stripEveMarkup(input)).toBe(expected);
    }
  });
});
