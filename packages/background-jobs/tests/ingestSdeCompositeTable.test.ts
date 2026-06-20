import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { ingestSdeCompositeTable as IngestSdeCompositeTable } from "../helpers/ingestSdeCompositeTable";

// The helper pulls in p-limit (ESM) and, via ../utils, inngest + the zod-checked
// env. Stub them so the test exercises only the diff/filter/chunk orchestration.
// (@swc/jest doesn't hoist jest.mock, and p-limit crashes if loaded for real, so
// the helper is imported lazily in beforeAll — after these mocks are registered.)
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));
jest.mock("inngest", () => ({
  NonRetriableError: class NonRetriableError extends Error {},
}));
jest.mock("../env", () => ({ env: { NODE_ENV: "test" } }));

let ingestSdeCompositeTable: typeof IngestSdeCompositeTable;

beforeAll(async () => {
  ({ ingestSdeCompositeTable } =
    await import("../helpers/ingestSdeCompositeTable"));
});

// Index signature so Row satisfies the helper's `Record<string, unknown>` bound
// (interfaces, unlike type aliases, don't get one implicitly).
interface Row extends Record<string, unknown> {
  typeId: number;
  attributeId: number;
  value: number;
  isDeleted: boolean;
}

// Local (DB) rows carry timestamps the helper must strip before diffing.
const withTimestamps = (rows: Row[]) =>
  rows.map((row) => ({
    ...row,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));

const makeDelegate = (local: Record<string, unknown>[]) => ({
  findMany: jest.fn((_args?: unknown) => Promise.resolve(local)),
  createMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
  update: jest.fn((_args?: unknown) => Promise.resolve({})),
  updateMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
});

describe("ingestSdeCompositeTable", () => {
  it("never soft-deletes another writer's rows when softDelete is false", async () => {
    // DB holds an ESI-only row (1:20) the SDE doesn't list — it must survive.
    const delegate = makeDelegate(
      withTimestamps([
        { typeId: 1, attributeId: 10, value: 99, isDeleted: false }, // shared, value differs → update
        { typeId: 1, attributeId: 20, value: 9, isDeleted: false }, // ESI-only → must NOT be deleted
      ]),
    );
    const rows: Row[] = [
      { typeId: 1, attributeId: 10, value: 5, isDeleted: false }, // shared
      { typeId: 1, attributeId: 30, value: 7, isDeleted: false }, // SDE-only → create
    ];

    const stats = await ingestSdeCompositeTable({
      delegate,
      rows,
      keyFields: ["typeId", "attributeId"],
      scopeField: "typeId",
      scopeIds: [1],
      softDelete: false,
    });

    // Additive: create the SDE-only row, refresh the shared one, delete nothing.
    expect(delegate.updateMany).not.toHaveBeenCalled();
    expect(delegate.createMany).toHaveBeenCalledWith({ data: [rows[1]] });
    expect(delegate.update).toHaveBeenCalledTimes(1);
    expect(delegate.update).toHaveBeenCalledWith({
      data: rows[0],
      where: { typeId_attributeId: { typeId: 1, attributeId: 10 } },
    });
    expect(stats).toMatchObject({ created: 1, modified: 1, deleted: 0 });
  });

  it("chunks the soft-delete OR so it stays under the bind-param limit", async () => {
    // 15001 local rows with no SDE counterpart → all deleted. With a 2-column
    // key the cap is 15000 keys/statement, so this must split into 2 updateMany.
    const delegate = makeDelegate(
      withTimestamps(
        Array.from({ length: 15001 }, (_, i) => ({
          typeId: 1,
          attributeId: i,
          value: 0,
          isDeleted: false,
        })),
      ),
    );

    const stats = await ingestSdeCompositeTable({
      delegate,
      rows: [], // SDE lists nothing for type 1 → everything is a delete
      keyFields: ["typeId", "attributeId"],
      scopeField: "typeId",
      scopeIds: [1],
    });

    expect(stats.deleted).toBe(15001);
    expect(delegate.updateMany).toHaveBeenCalledTimes(2);
    const orSizes = delegate.updateMany.mock.calls.map(
      ([args]) => (args as { where: { OR: unknown[] } }).where.OR.length,
    );
    expect(Math.max(...orSizes)).toBeLessThanOrEqual(15000);
    expect(orSizes.reduce((sum, n) => sum + n, 0)).toBe(15001);
  });
});
