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
    for (const input of [
      "<scr<b>ipt>alert(1)</scr<b>ipt>",
      "<<script>script>alert(1)",
      "a <b unterminated",
    ]) {
      expect(stripEveMarkup(input)).not.toContain("<");
    }
  });
});
