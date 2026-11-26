import { describe, expect, it } from "@jest/globals";

import { SHIP_TREE_DATA_BASE_URL } from "../data";

describe("SHIP_TREE_DATA_BASE_URL", () => {
  it("is a same-origin path, so the CSP's connect-src 'self' covers it", () => {
    expect(SHIP_TREE_DATA_BASE_URL).toBe("/ship-tree-data");
    expect(SHIP_TREE_DATA_BASE_URL.startsWith("/")).toBe(true);
    expect(SHIP_TREE_DATA_BASE_URL.endsWith("/")).toBe(false);
  });
});
