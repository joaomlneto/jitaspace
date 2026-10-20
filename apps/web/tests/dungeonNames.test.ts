/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Type-only import: erased at runtime; the module is required after the mocks.
import type * as DungeonNames from "~/lib/dungeon-names";

const findMany = jest.fn<(args: unknown) => Promise<unknown>>();
jest.mock("@jitaspace/db-builds", () => ({
  buildsDb: { entity: { findMany: (args: unknown) => findMany(args) } },
}));
jest.mock("next/cache", () => ({ cacheLife: () => undefined }));
const captureException = jest.fn();
jest.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));
const connection = jest.fn(() => Promise.resolve());
jest.mock("next/server", () => ({ connection: () => connection() }));

// Lazy-require after jest.mock: next/jest (SWC) does not hoist jest.mock.
const { loadStoredDungeonNames } =
  require("~/lib/dungeon-names") as typeof DungeonNames;

beforeEach(() => {
  findMany.mockReset();
  captureException.mockClear();
  connection.mockClear();
});

describe("loadStoredDungeonNames", () => {
  it("maps each named dungeon to the name the history DB stores", async () => {
    findMany.mockResolvedValue([
      { eveId: 184, name: "Seek and Destroy" },
      { eveId: 700, name: "The Bonfire" },
    ]);

    expect(await loadStoredDungeonNames()).toEqual(
      new Map([
        [184, "Seek and Destroy"],
        [700, "The Bonfire"],
      ]),
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { kind: "dungeon", name: { not: null } },
      select: { eveId: true, name: true },
    });
  });

  it("degrades to no names on a failure, reported and kept out of the cache", async () => {
    findMany.mockRejectedValue(new Error("history db down"));

    expect(await loadStoredDungeonNames()).toEqual(new Map());
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(connection).toHaveBeenCalledTimes(1);
  });
});
