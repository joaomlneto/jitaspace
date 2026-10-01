/**
 * @jest-environment node
 */
import { readFile } from "node:fs/promises";
import { findPackageJSON } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "@jest/globals";

import { SHIP_TREE_DATA_FILE_NAMES } from "../data";
import * as server from "../server";
import { readShipTreeDataFile } from "../server";

const libraryManifest = findPackageJSON(
  "@eve-online-tools/eve-ship-tree",
  join(process.cwd(), "noop.js"),
);

// The web route imports these from `/server` so that it never reaches into the
// client barrel, which would hand it client references instead of values.
describe("the server entry", () => {
  it("re-exports the data names the route needs", () => {
    expect(server.SHIP_TREE_DATA_FILE_NAMES).toBe(SHIP_TREE_DATA_FILE_NAMES);
    expect(server.isShipTreeDataFileName("types.jsonl")).toBe(true);
  });
});

describe("readShipTreeDataFile", () => {
  it("serves the installed library's own file, byte for byte", async () => {
    expect(libraryManifest).toBeTruthy();
    const onDisk = await readFile(
      join(
        dirname(libraryManifest ?? ""),
        "dist",
        "data",
        "generated",
        "types.jsonl",
      ),
      "utf8",
    );

    expect(await readShipTreeDataFile("types.jsonl")).toBe(onDisk);
  });

  it.each(SHIP_TREE_DATA_FILE_NAMES)(
    "reads %s as non-empty JSON Lines",
    async (name) => {
      const content = await readShipTreeDataFile(name);

      expect(content).not.toBeNull();
      const lines = (content ?? "").split("\n").filter((line) => line !== "");
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(() => JSON.parse(line) as unknown).not.toThrow();
      }
    },
  );

  it.each([
    "nope.jsonl",
    "",
    "../../package.json",
    "../../../.env",
    "..\\..\\package.json",
    "staticDataFiles.jsonl",
    "types.jsonl\0.png",
  ])("returns null for %j without reading anything", async (name) => {
    expect(await readShipTreeDataFile(name)).toBeNull();
  });
});
