import { describe, expect, it } from "@jest/globals";

import type { DiffPart } from "~/lib/text-diff";
import { diffModeForLanguage, diffText, tokenize } from "~/lib/text-diff";

/** "=same -gone +new" — a compact, readable spelling of a diff. */
const show = (parts: DiffPart[]) =>
  parts
    .map((p) => `${{ equal: "=", insert: "+", delete: "-" }[p.op]}${p.text}`)
    .join("|");

describe("diffModeForLanguage", () => {
  it.each([
    ["zh", "char"],
    ["ja", "char"],
    ["ZH", "char"],
    ["en-us", "word"],
    ["de", "word"],
    ["ko", "word"],
    ["ru", "word"],
  ])("compares %s by %s", (lang, mode) => {
    expect(diffModeForLanguage(lang)).toBe(mode);
  });
});

describe("tokenize", () => {
  it("splits words, spaces and punctuation", () => {
    expect(tokenize("Hello, world!", "word")).toEqual([
      "Hello",
      ",",
      " ",
      "world",
      "!",
    ]);
  });

  it("keeps EVE markup and placeholders as single tokens", () => {
    expect(
      tokenize("<color=0xffffffff>Hi</color> {[character]player.name}", "word"),
    ).toEqual([
      "<color=0xffffffff>",
      "Hi",
      "</color>",
      " ",
      "{[character]player.name}",
    ]);
  });

  it("keeps accented letters and apostrophes inside words", () => {
    expect(tokenize("Über l’été", "word")).toEqual(["Über", " ", "l’été"]);
  });

  it("splits text into characters in char mode, markup still whole", () => {
    expect(tokenize("你好<b>世界</b>", "char")).toEqual([
      "你",
      "好",
      "<b>",
      "世",
      "界",
      "</b>",
    ]);
  });
});

describe("diffText", () => {
  it("marks only the changed words", () => {
    expect(show(diffText("The quick fox", "The slow fox", "word"))).toBe(
      "=The |-quick|+slow|= fox",
    );
  });

  it("returns a single equal part when nothing changed", () => {
    expect(diffText("Same text", "Same text", "word")).toEqual([
      { op: "equal", text: "Same text" },
    ]);
  });

  it("treats an added string as one insertion and a removed one as a deletion", () => {
    expect(diffText(undefined, "New", "word")).toEqual([
      { op: "insert", text: "New" },
    ]);
    expect(diffText("Gone", undefined, "word")).toEqual([
      { op: "delete", text: "Gone" },
    ]);
    expect(diffText(undefined, undefined, "word")).toEqual([]);
  });

  it("aligns insertions and deletions in the middle of a sentence", () => {
    expect(show(diffText("a b c d e", "a x c d y e", "word"))).toBe(
      "=a |-b|+x|= c d|+ y|= e",
    );
  });

  it("compares Chinese character by character", () => {
    expect(show(diffText("我爱伊芙", "我恨伊芙", "char"))).toBe(
      "=我|-爱|+恨|=伊芙",
    );
  });

  it("would treat the same Chinese sentence as one word in word mode", () => {
    expect(show(diffText("我爱伊芙", "我恨伊芙", "word"))).toBe(
      "-我爱伊芙|+我恨伊芙",
    );
  });

  it("shows a changed tag as one replaced tag", () => {
    expect(
      show(
        diffText(
          "<color=0xff00ff00>Ready</color>",
          "<color=0xffff0000>Ready</color>",
          "word",
        ),
      ),
    ).toBe("-<color=0xff00ff00>|+<color=0xffff0000>|=Ready</color>");
  });

  it("falls back to delete-then-insert when the middle is too large to align", () => {
    const from = Array.from({ length: 2100 }, (_, i) => `a${i}`).join(" ");
    const to = Array.from({ length: 2100 }, (_, i) => `b${i}`).join(" ");
    const parts = diffText(`start ${from} end`, `start ${to} end`, "word");
    expect(parts.map((p) => p.op)).toEqual([
      "equal",
      "delete",
      "insert",
      "equal",
    ]);
    expect(parts[0]?.text).toBe("start ");
    expect(parts[3]?.text).toBe(" end");
  });
});

describe("diffText on long strings and odd input", () => {
  it("aligns a few small edits anywhere in a long string", () => {
    const words = Array.from({ length: 5000 }, (_, i) => `word${i}`);
    const from = words.join(" ");
    const to = from.replace("word10 ", "WORD10 ").replace("word4990", "W4990");
    const edits = diffText(from, to, "word").filter((p) => p.op !== "equal");
    expect(edits.map((p) => `${p.op}:${p.text}`)).toEqual([
      "delete:word10",
      "insert:WORD10",
      "delete:word4990",
      "insert:W4990",
    ]);
  });

  it("replaces a near-total rewrite of a long string wholesale", () => {
    const from = Array.from({ length: 2000 }, (_, i) => `a${i}`).join(" ");
    const to = Array.from({ length: 2000 }, (_, i) => `b${i}`).join(" ");
    expect(diffText(from, to, "word").map((p) => p.op)).toEqual([
      "delete",
      "insert",
    ]);
  });

  it("does not read angle brackets in prose as markup", () => {
    expect(
      show(
        diffText(
          "Range < 10 km and speed > 5",
          "Range < 20 km and speed > 5",
          "word",
        ),
      ),
    ).toBe("=Range < |-10|+20|= km and speed > 5");
  });

  it("keeps characters whole and Latin words together in character mode", () => {
    expect(tokenize("A👨‍👩‍👧 e\u0301 Ship10個", "char")).toEqual([
      "A",
      "👨‍👩‍👧",
      " ",
      "e\u0301",
      " ",
      "Ship10",
      "個",
    ]);
  });
});
