/**
 * @jest-environment node
 */
import { loadShipTreeData } from "@eve-online-tools/eve-ship-tree";
import { describe, expect, it } from "@jest/globals";

import {
  isShipTreeDataFileName,
  SHIP_TREE_DATA_BASE_URL,
  SHIP_TREE_DATA_FILE_NAMES,
} from "../data";
import { ALL_TABLE_FILES, byName, fileName } from "./helpers";

describe("SHIP_TREE_DATA_FILE_NAMES", () => {
  it("lists distinct .jsonl files", () => {
    expect(new Set(SHIP_TREE_DATA_FILE_NAMES).size).toBe(
      SHIP_TREE_DATA_FILE_NAMES.length,
    );
    for (const name of SHIP_TREE_DATA_FILE_NAMES) {
      expect(name).toMatch(/^[A-Za-z]+\.jsonl$/);
    }
  });

  // The type-level `satisfies` in data.ts ties the names to the library's
  // exported `DataTableName`; this ties them to what its loader actually asks
  // for, which is the thing that would 404 in a browser.
  it("is exactly the set of files the library's loader requests", async () => {
    const requested: string[] = [];
    await loadShipTreeData({
      baseUrl: "http://data.invalid/tables",
      fetch: (input: unknown) => {
        requested.push(String(input));
        return Promise.resolve(new Response(""));
      },
    });

    expect(requested.map(fileName).sort(byName)).toEqual(ALL_TABLE_FILES);
    for (const url of requested) {
      expect(url.startsWith("http://data.invalid/tables/")).toBe(true);
    }
  });
});

describe("isShipTreeDataFileName", () => {
  it.each(SHIP_TREE_DATA_FILE_NAMES)("accepts %s", (name) => {
    expect(isShipTreeDataFileName(name)).toBe(true);
  });

  it.each([
    "",
    "types",
    "types.json",
    "Types.jsonl",
    " types.jsonl",
    "types.jsonl ",
    "types.jsonl/",
    "../types.jsonl",
    "../../package.json",
    "..%2F..%2Fpackage.json",
    "/etc/passwd",
    "nested/types.jsonl",
    // Shipped in the same directory, but not a table the library loads.
    "staticDataFiles.jsonl",
    "__proto__",
    "constructor",
  ])("rejects %j", (name) => {
    expect(isShipTreeDataFileName(name)).toBe(false);
  });
});

describe("SHIP_TREE_DATA_BASE_URL", () => {
  it("is a same-origin path, so the CSP's connect-src 'self' covers it", () => {
    expect(SHIP_TREE_DATA_BASE_URL).toBe("/api/ship-tree-data");
    expect(SHIP_TREE_DATA_BASE_URL.startsWith("/")).toBe(true);
    expect(SHIP_TREE_DATA_BASE_URL.endsWith("/")).toBe(false);
  });
});
