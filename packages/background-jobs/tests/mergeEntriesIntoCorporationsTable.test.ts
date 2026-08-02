import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { Corporation } from "../db";
import type { mergeEntriesIntoCorporationsTable as MergeEntriesIntoCorporationsTable } from "../helpers/mergeEntriesIntoCorporationsTable";

// The helper pulls in p-limit (ESM), the zod-checked env (via ../db -> ../env),
// and a real Prisma client. Stub them so the test exercises only the
// diff/filter orchestration through updateTable.
// (@swc/jest doesn't hoist jest.mock, and the real modules crash if loaded, so
// the helper is imported lazily in beforeAll — after these mocks are registered.)
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

const corporation = {
  findMany: jest.fn((_args?: unknown) => Promise.resolve<unknown[]>([])),
  createMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
  update: jest.fn((_args?: unknown) => Promise.resolve({})),
  updateMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
};

jest.mock("../db", () => ({ prisma: { corporation } }));

let mergeEntriesIntoCorporationsTable: typeof MergeEntriesIntoCorporationsTable;

beforeAll(async () => {
  ({ mergeEntriesIntoCorporationsTable } =
    await import("../helpers/mergeEntriesIntoCorporationsTable"));
});

// A corporation record as produced by convertEsiCorporationToDomain: it has no
// createdAt/updatedAt.
const remoteRecord: Omit<Corporation, "updatedAt" | "createdAt"> = {
  corporationId: 1000,
  allianceId: null,
  ceoId: 2000,
  creatorId: 2000,
  dateFounded: new Date("2018-01-01"),
  description: null,
  factionId: null,
  homeStationId: null,
  memberCount: 42,
  name: "Test Corp",
  shares: null,
  taxRate: 0.1,
  ticker: "TEST",
  url: null,
  warEligible: null,
  isDeleted: false,
};

describe("mergeEntriesIntoCorporationsTable", () => {
  it("does not update a row whose only difference is the createdAt/updatedAt timestamps", async () => {
    // The DB row is identical to the incoming ESI record except it also carries
    // createdAt (a Date) and updatedAt — columns the local fetch must strip so
    // the diff sees the two records as equal.
    corporation.findMany.mockResolvedValueOnce([
      {
        ...remoteRecord,
        createdAt: new Date("2017-06-01"),
        updatedAt: new Date("2017-06-01"),
      },
    ]);

    const stats = await mergeEntriesIntoCorporationsTable([remoteRecord]);

    // The unchanged row must land in the "equal" bucket, not "modified", so no
    // per-row update is issued. (batchDelete still runs updateMany once with an
    // empty id list — nothing is soft-deleted.)
    expect(corporation.update).not.toHaveBeenCalled();
    expect(corporation.createMany).toHaveBeenCalledWith({ data: [] });
    expect(corporation.updateMany).toHaveBeenCalledWith({
      data: { isDeleted: true },
      where: { corporationId: { in: [] } },
    });
    expect(stats).toMatchObject({ created: 0, modified: 0, equal: 1 });
  });

  it("updates a row when a real field changed", async () => {
    corporation.findMany.mockResolvedValueOnce([
      {
        ...remoteRecord,
        memberCount: 1,
        createdAt: new Date("2017-06-01"),
        updatedAt: new Date("2017-06-01"),
      },
    ]);

    const stats = await mergeEntriesIntoCorporationsTable([remoteRecord]);

    expect(corporation.update).toHaveBeenCalledTimes(1);
    expect(corporation.update).toHaveBeenCalledWith({
      data: remoteRecord,
      where: { corporationId: 1000 },
    });
    expect(stats).toMatchObject({ created: 0, modified: 1, equal: 0 });
  });
});
