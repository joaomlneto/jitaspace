import { describe, expect, it } from "@jest/globals";

import { stripEveMarkup } from "~/lib/eveMarkup";

// HTML opens a tag only on `<` plus one of these.
const TAG_OPEN = /<[a-z/!?]/i;

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

  // Production character titles, compared with the game client (2026-11-08).
  describe("matches the game client", () => {
    it("hides everything after a `<` that never closes", () => {
      // In-game: `CEO`.
      expect(stripEveMarkup("CEO <3")).toBe("CEO");
      // Titles EVE cut off at about 100 characters, inside a tag.
      expect(stripEveMarkup("<color=0xffE50000>Drone Master</color")).toBe(
        "Drone Master",
      );
      expect(stripEveMarkup("<color=green> Engineering team<")).toBe(
        "Engineering team",
      );
      expect(stripEveMarkup("<color=green> Engineering team< ")).toBe(
        "Engineering team",
      );
      expect(stripEveMarkup("<b>CEO</b> <color=0x")).toBe("CEO");
      expect(
        stripEveMarkup(
          "<0xffa91c27>V</c><color=0xff83161e>E<color=0xff5e1016>T<color=0xff5e1016>E<color=0xff38090d>R<color=",
        ),
      ).toBe("VETER");
      expect(stripEveMarkup("<color=0xff007f The Boss")).toBe("");
    });

    it("shows a `<` that meets another `<` first as text", () => {
      // In-game: `<大A`.
      expect(
        stripEveMarkup("<color=0xffFF8C69><b><大A<u></b></i></u></color>"),
      ).toBe("<大A");
      expect(stripEveMarkup("I love you all! <3 · </b>")).toBe(
        "I love you all! <3 ·",
      );
      expect(stripEveMarkup("1 < 2 <b>bold</b>")).toBe("1 < 2 bold");
      expect(stripEveMarkup(">> sexy <<")).toBe(">> sexy <");
      // `<Director>` is tag-shaped, so it goes.
      expect(stripEveMarkup("<<Director>>")).toBe("<>");
    });

    it("hides malformed tags", () => {
      expect(
        stripEveMarkup("<b><color=0xfff90082>PhD in Logistics<\\color><\\b>"),
      ).toBe("PhD in Logistics");
      expect(stripEveMarkup("<0xFFFF0000>Director</color>")).toBe("Director");
      expect(stripEveMarkup('<color="Red"><"b">Pirate</Red></b> ')).toBe(
        "Pirate",
      );
      expect(stripEveMarkup('< size="29"> 6666 </size>')).toBe("6666");
    });
  });

  describe("decodes character references after parsing tags", () => {
    it("shows the brackets and ampersands authors escaped", () => {
      // Production character titles (2026-11-08).
      const cases: [string, string][] = [
        ["&lt;3", "<3"],
        ["&lt;CEO&gt;", "<CEO>"],
        ["Squad Member, Rank: &lt;Ensign&gt;", "Squad Member, Rank: <Ensign>"],
        ["&lt;&lt;Founder&gt;&gt;", "<<Founder>>"],
        ["&lt;b&gt;Smokin'&lt;/b&gt;", "<b>Smokin'</b>"],
        [
          "Assistant Dress Maker &amp; Silver Polisher",
          "Assistant Dress Maker & Silver Polisher",
        ],
        [
          "[18:36:54] Tarmo theGreat &gt; you are a great leader",
          "[18:36:54] Tarmo theGreat > you are a great leader",
        ],
      ];
      for (const [input, expected] of cases) {
        expect(stripEveMarkup(input)).toBe(expected);
      }
    });

    it("decodes once, and numeric references too", () => {
      expect(stripEveMarkup("&amp;lt;")).toBe("&lt;");
      expect(stripEveMarkup("&#60;&#x3C;&#X3c;")).toBe("<<<");
      expect(stripEveMarkup("&quot;Ace&quot; &apos;s")).toBe('"Ace" \'s');
      expect(stripEveMarkup("a&nbsp;&nbsp;b")).toBe("a b");
      expect(stripEveMarkup("&#0;&#xD800;&#1114112;")).toBe("���");
    });

    it("leaves what is not a reference as written", () => {
      expect(stripEveMarkup("R&D")).toBe("R&D");
      expect(stripEveMarkup("Fish &chips; and &amp")).toBe(
        "Fish &chips; and &amp",
      );
      expect(stripEveMarkup("&constructor; &toString;")).toBe(
        "&constructor; &toString;",
      );
      expect(stripEveMarkup("&#12345678901234;")).toBe("&#12345678901234;");
    });

    it("drops references inside tags with the tag", () => {
      expect(stripEveMarkup('<font color="&quot;red">x</font>')).toBe("x");
    });
  });

  describe("never lets a tag form in its result", () => {
    it("drops a text `<` that would open one", () => {
      expect(
        stripEveMarkup("Reduces range <optimal falloff. <b>Note</b>: x"),
      ).toBe("Reduces range optimal falloff. Note: x");
    });

    it("cannot reassemble a tag from nested fragments", () => {
      // A single regex pass removes only the inner tag and leaves `<script>`.
      const cases: [string, string][] = [
        ["<scr<b>ipt>alert(1)</scr<b>ipt>", "script>alert(1)/script>"],
        ["<<script>script>alert(1)", "script>alert(1)"],
        ["<<b>script>alert(1)", "script>alert(1)"],
        ["<</b>/script>", "/script>"],
        // However many text `<` precede the tag.
        ["<<<b>script>alert(1)", "script>alert(1)"],
        ["<<<i>img src=x onerror=alert(1)>", "img src=x onerror=alert(1)>"],
        ["x <<<</b>/script>", "x /script>"],
        ["<<<<b>!--", "!--"],
        ["<<<>a", "a"],
        // Nor when the letter after it is a character reference.
        ["<<b>&#115;cript>alert(1)", "script>alert(1)"],
        ["<<b>&#x2F;script>", "/script>"],
        ["a <b unterminated", "a"],
      ];
      for (const [input, expected] of cases) {
        const result = stripEveMarkup(input);
        expect(result).toBe(expected);
        expect(result).not.toMatch(TAG_OPEN);
      }
    });
  });

  it("stays linear on long input", () => {
    // An earlier version was quadratic: ~2 s for 100k characters.
    const long = "word ".repeat(40_000) + "<b>bold</b> ".repeat(10_000);
    const started = performance.now();
    stripEveMarkup(long);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
