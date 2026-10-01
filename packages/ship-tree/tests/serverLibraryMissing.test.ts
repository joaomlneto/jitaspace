/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockFindPackageJSON = jest.fn();
jest.mock("node:module", () => ({
  findPackageJSON: (...args: unknown[]) => mockFindPackageJSON(...args),
}));

// Required after the mock is registered: @swc/jest does not hoist jest.mock
// above a top-level import.
const { readShipTreeDataFile } = require("../server");

describe("readShipTreeDataFile when the library cannot be found", () => {
  beforeEach(() => {
    mockFindPackageJSON.mockReset();
  });

  it("fails loudly rather than answering 'no such table'", async () => {
    mockFindPackageJSON.mockReturnValue(undefined);

    await expect(readShipTreeDataFile("types.jsonl")).rejects.toThrow(
      "Cannot locate @eve-online-tools/eve-ship-tree; is it installed?",
    );
  });

  it("lets the resolver's own error through", async () => {
    mockFindPackageJSON.mockImplementation(() => {
      throw new Error("ERR_MODULE_NOT_FOUND");
    });

    await expect(readShipTreeDataFile("types.jsonl")).rejects.toThrow(
      "ERR_MODULE_NOT_FOUND",
    );
  });

  it("still refuses a bad name before it tries to find anything", async () => {
    expect(await readShipTreeDataFile("../../package.json")).toBeNull();
    expect(mockFindPackageJSON).not.toHaveBeenCalled();
  });
});
