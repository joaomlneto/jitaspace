import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { updateTable } from "../../utils/updateTable";

// updateTable -> compareSets pulls in `inngest` and the zod-validated env.
// Stub both so the test exercises only the sync/diff orchestration logic.
jest.mock("inngest", () => ({
  NonRetriableError: class NonRetriableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "NonRetriableError";
    }
  },
}));
jest.mock("../../env", () => ({ env: { NODE_ENV: "test" } }));

interface Row {
  id: number;
  name: string;
}
type BatchFn = jest.Mock<(entries: Row[]) => Promise<void>>;

const idAccessor = (row: Row) => row.id;

describe("updateTable", () => {
  let batchCreate: BatchFn;
  let batchUpdate: BatchFn;
  let batchDelete: BatchFn;

  beforeEach(() => {
    batchCreate = jest.fn<(entries: Row[]) => Promise<void>>(() =>
      Promise.resolve(),
    );
    batchUpdate = jest.fn<(entries: Row[]) => Promise<void>>(() =>
      Promise.resolve(),
    );
    batchDelete = jest.fn<(entries: Row[]) => Promise<void>>(() =>
      Promise.resolve(),
    );
  });

  const run = (local: Row[], remote: Row[]) =>
    updateTable<Row, number>({
      idAccessor,
      fetchLocalEntries: () => Promise.resolve(local),
      fetchRemoteEntries: () => Promise.resolve(remote),
      batchCreate,
      batchUpdate,
      batchDelete,
    });

  it("routes created/modified/deleted/equal rows to the right batch fns", async () => {
    const local: Row[] = [
      { id: 1, name: "unchanged" },
      { id: 2, name: "old" },
      { id: 3, name: "gone" },
    ];
    const remote: Row[] = [
      { id: 1, name: "unchanged" }, // equal
      { id: 2, name: "new" }, // modified
      { id: 4, name: "fresh" }, // created
    ];

    const stats = await run(local, remote);

    expect(stats).toEqual({ created: 1, modified: 1, deleted: 1, equal: 1 });
    expect(batchCreate).toHaveBeenCalledWith([{ id: 4, name: "fresh" }]);
    expect(batchUpdate).toHaveBeenCalledWith([{ id: 2, name: "new" }]);
    expect(batchDelete).toHaveBeenCalledWith([{ id: 3, name: "gone" }]);
  });

  it("handles empty local and remote sets", async () => {
    const stats = await run([], []);
    expect(stats).toEqual({ created: 0, modified: 0, deleted: 0, equal: 0 });
    expect(batchCreate).toHaveBeenCalledWith([]);
    expect(batchUpdate).toHaveBeenCalledWith([]);
    expect(batchDelete).toHaveBeenCalledWith([]);
  });

  it("treats every remote row as created when local is empty", async () => {
    const remote: Row[] = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ];
    const stats = await run([], remote);
    expect(stats).toEqual({ created: 2, modified: 0, deleted: 0, equal: 0 });
    expect(batchCreate).toHaveBeenCalledWith(remote);
    expect(batchDelete).toHaveBeenCalledWith([]);
  });

  it("treats every local row as deleted when remote is empty", async () => {
    const local: Row[] = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ];
    const stats = await run(local, []);
    expect(stats).toEqual({ created: 0, modified: 0, deleted: 2, equal: 0 });
    expect(batchDelete).toHaveBeenCalledWith(local);
    expect(batchCreate).toHaveBeenCalledWith([]);
  });

  it("invokes the batch functions in create -> update -> delete order", async () => {
    const order: string[] = [];
    batchCreate.mockImplementation(() => {
      order.push("create");
      return Promise.resolve();
    });
    batchUpdate.mockImplementation(() => {
      order.push("update");
      return Promise.resolve();
    });
    batchDelete.mockImplementation(() => {
      order.push("delete");
      return Promise.resolve();
    });

    await run([{ id: 1, name: "x" }], [{ id: 2, name: "y" }]);

    expect(order).toEqual(["create", "update", "delete"]);
  });
});
