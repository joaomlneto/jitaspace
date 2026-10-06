/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import { SHIP_TREE_DATA_FILE_NAMES } from "@jitaspace/ship-tree/server";

import {
  generateStaticParams,
  GET,
} from "../app/api/ship-tree-data/[file]/route";

const get = (file: string) =>
  GET(new Request(`https://www.jita.space/api/ship-tree-data/${file}`), {
    params: Promise.resolve({ file }),
  });

describe("/api/ship-tree-data/[file]", () => {
  it("prerenders exactly the library's data tables", () => {
    expect(generateStaticParams()).toEqual(
      SHIP_TREE_DATA_FILE_NAMES.map((file) => ({ file })),
    );
    expect(generateStaticParams()).toHaveLength(14);
  });

  it.each(SHIP_TREE_DATA_FILE_NAMES)(
    "serves %s as JSON Lines",
    async (file) => {
      const response = await get(file);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(
        "application/x-ndjson; charset=utf-8",
      );
      const body = await response.text();
      const lines = body.split("\n").filter((line) => line !== "");
      expect(lines.length).toBeGreaterThan(0);
      expect(() => JSON.parse(lines[0] ?? "") as unknown).not.toThrow();
    },
  );

  it.each([
    "nope.jsonl",
    "staticDataFiles.jsonl",
    "../../package.json",
    "..%2F..%2Fpackage.json",
    "",
  ])("answers 404 for %j", async (file) => {
    const response = await get(file);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });
});
