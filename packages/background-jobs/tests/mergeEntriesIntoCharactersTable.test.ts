import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { Character } from "../db";
import type { mergeEntriesIntoCharactersTable as MergeEntriesIntoCharactersTable } from "../helpers/mergeEntriesIntoCharactersTable";

// The helper pulls in p-limit (ESM), the zod-checked env (via ../db -> ../env),
// and a real Prisma client. Stub them so the test exercises only the
// diff/filter orchestration through updateTable.
// (@swc/jest doesn't hoist jest.mock, and the real modules crash if loaded, so
// the helper is imported lazily in beforeAll — after these mocks are registered.)
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

const character = {
  findMany: jest.fn((_args?: unknown) => Promise.resolve<unknown[]>([])),
  createMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
  update: jest.fn((_args?: unknown) => Promise.resolve({})),
  updateMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
};

jest.mock("../db", () => ({ prisma: { character } }));

let mergeEntriesIntoCharactersTable: typeof MergeEntriesIntoCharactersTable;

beforeAll(async () => {
  ({ mergeEntriesIntoCharactersTable } =
    await import("../helpers/mergeEntriesIntoCharactersTable"));
});

// An ESI-derived record, as produced by convertEsiCharacterToDomain: it has no
// createdAt/updatedAt.
const remoteRecord: Omit<Character, "updatedAt" | "createdAt"> = {
  characterId: 1,
  birthday: new Date("2020-01-01"),
  bloodlineId: 1,
  corporationId: 1000,
  description: null,
  factionId: null,
  gender: "male",
  name: "Test Pilot",
  raceId: 1,
  securityStatus: null,
  title: null,
  isDeleted: false,
};

describe("mergeEntriesIntoCharactersTable", () => {
  it("does not update a row whose only difference is the createdAt/updatedAt timestamps", async () => {
    // The DB row is identical to the incoming ESI record except it also carries
    // createdAt (a Date) and updatedAt — columns the local fetch must strip so
    // the diff sees the two records as equal.
    character.findMany.mockResolvedValueOnce([
      {
        ...remoteRecord,
        createdAt: new Date("2019-06-01"),
        updatedAt: new Date("2019-06-01"),
      },
    ]);

    const stats = await mergeEntriesIntoCharactersTable([remoteRecord]);

    // The unchanged row must land in the "equal" bucket, not "modified", so no
    // per-row update is issued. (batchDelete still runs updateMany once with an
    // empty id list — nothing is soft-deleted.)
    expect(character.update).not.toHaveBeenCalled();
    expect(character.createMany).toHaveBeenCalledWith({ data: [] });
    expect(character.updateMany).toHaveBeenCalledWith({
      data: { isDeleted: true },
      where: { characterId: { in: [] } },
    });
    expect(stats).toMatchObject({ created: 0, modified: 0, equal: 1 });
  });

  it("updates a row when a real field changed", async () => {
    character.findMany.mockResolvedValueOnce([
      {
        ...remoteRecord,
        name: "Old Name",
        createdAt: new Date("2019-06-01"),
        updatedAt: new Date("2019-06-01"),
      },
    ]);

    const stats = await mergeEntriesIntoCharactersTable([remoteRecord]);

    expect(character.update).toHaveBeenCalledTimes(1);
    expect(character.update).toHaveBeenCalledWith({
      data: remoteRecord,
      where: { characterId: 1 },
    });
    expect(stats).toMatchObject({ created: 0, modified: 1, equal: 0 });
  });
});
