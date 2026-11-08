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
      ["<scr<b>ipt>alert(1)</scr<b>ipt>", "script>alert(1)/script>"],
      ["<<script>script>alert(1)", "script>alert(1)"],
      ["a <b unterminated", "a b unterminated"],
    ];
    for (const [input, expected] of cases) {
      const result = stripEveMarkup(input);
      expect(result).toBe(expected);
      expect(result).not.toContain("<");
    }
  });

  it("drops a stray `<` alone, keeping the text after it", () => {
    expect(stripEveMarkup("I <3 Jita")).toBe("I 3 Jita");
    expect(stripEveMarkup("CEO < Director")).toBe("CEO Director");
    expect(stripEveMarkup("-> Logistics <-")).toBe("-> Logistics -");
    // `<Director>` is tag-shaped, so it goes, as it did under the old regex.
    expect(stripEveMarkup("<<Director>>")).toBe(">");
    expect(stripEveMarkup("1 < 2 <b>bold</b>")).toBe("1 2 bold");
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
