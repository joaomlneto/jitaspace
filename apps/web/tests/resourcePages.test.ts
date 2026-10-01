import { describe, expect, it } from "@jest/globals";

import {
  compareLanguages,
  filePageHref,
  formatBytes,
  parseFilePathSegments,
  stringPageHref,
} from "~/lib/resource-pages";

describe("compareLanguages", () => {
  it("puts English first, then sorts by code", () => {
    expect(["zh", "de", "en-us", "fr"].sort(compareLanguages)).toEqual([
      "en-us",
      "de",
      "fr",
      "zh",
    ]);
    expect(compareLanguages("de", "de")).toBe(0);
  });
});

describe("page hrefs", () => {
  it("links a string by its id", () => {
    expect(stringPageHref(123456)).toBe("/string/123456");
  });

  it("keeps a file path readable, encoding only what must be", () => {
    expect(filePageHref("res:/ui/texture/icons/1_64_1.png")).toBe(
      "/file/res:/ui/texture/icons/1_64_1.png",
    );
    expect(filePageHref("res:/a dir/50%#.txt")).toBe(
      "/file/res:/a%20dir/50%25%23.txt",
    );
  });
});

describe("parseFilePathSegments", () => {
  it("rebuilds the path from decoded or encoded segments", () => {
    expect(parseFilePathSegments(["res:", "ui", "a.png"])).toBe(
      "res:/ui/a.png",
    );
    expect(parseFilePathSegments(["res%3A", "a%20dir", "50%25.txt"])).toBe(
      "res:/a dir/50%.txt",
    );
    expect(parseFilePathSegments(["APP:", "bin", "x.dll"])).toBe(
      "app:/bin/x.dll",
    );
  });

  it("round-trips through filePageHref", () => {
    const path = "res:/a dir/50%#.txt";
    const segments = filePageHref(path).slice("/file/".length).split("/");
    expect(parseFilePathSegments(segments)).toBe(path);
  });

  it.each([
    [undefined],
    [[]],
    [["res:"]],
    [["http:", "x"]],
    [["_"]],
    [["res:", "", "x"]],
    [["res:", "%E0%A4%A"]],
  ])("rejects %p", (segments) => {
    expect(parseFilePathSegments(segments)).toBeNull();
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [830, "830 B"],
    [1536, "1.5 KB"],
    [20 * 1024, "20 KB"],
    [1.4 * 1024 * 1024, "1.4 MB"],
    [3 * 1024 ** 3, "3 GB"],
    [5000 * 1024 ** 3, "5,000 GB"],
  ])("formats %p bytes as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});
