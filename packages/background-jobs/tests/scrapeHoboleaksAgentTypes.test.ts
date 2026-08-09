import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { scrapeHoboleaksAgentTypes as ScrapeHoboleaksAgentTypes } from "../jobs/scrape/hoboleaks/scrapeHoboleaksAgentTypes";
import type { CrudStatistics } from "../types";

// The job pulls in p-limit (ESM) and a real Prisma client (via ../db, which
// builds one from the zod-checked env). Stub both so the test exercises only the
// local-vs-remote diff the job feeds into updateTable.
// (@swc/jest doesn't hoist jest.mock, and the real modules crash if loaded, so
// the job is imported lazily in beforeAll — after these mocks are registered.)
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

const agentType = {
  findMany: jest.fn((_args?: unknown) => Promise.resolve<unknown[]>([])),
  createMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
  update: jest.fn((_args?: unknown) => Promise.resolve({})),
  updateMany: jest.fn((_args?: unknown) => Promise.resolve({ count: 0 })),
};

jest.mock("../db", () => ({ prisma: { agentType } }));

let scrapeHoboleaksAgentTypes: typeof ScrapeHoboleaksAgentTypes;

beforeAll(async () => {
  ({ scrapeHoboleaksAgentTypes } = await import(
    "../jobs/scrape/hoboleaks/scrapeHoboleaksAgentTypes"
  ));
});

/** The upstream Hoboleaks payload: `{ [agentTypeId]: name }`. */
const mockHoboleaksResponse = (agentTypes: Record<number, string>) => {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve(agentTypes) }),
  ) as unknown as typeof globalThis.fetch;
};

// The record the job derives from that payload — no createdAt/updatedAt.
const remoteRecord = { agentTypeId: 1, name: "BasicAgent", isDeleted: false };

const runJob = async () =>
  // The handler ignores its context, so an empty one is enough. `defineJob`
  // falls back to `unknown` for its result when only the payload type argument
  // is supplied, so name the shape the handler actually returns.
  (await scrapeHoboleaksAgentTypes.handler({} as never)) as {
    stats: { agentTypeChanges: CrudStatistics };
  };

describe("scrapeHoboleaksAgentTypes", () => {
  it("does not update a row whose only difference is the createdAt/updatedAt timestamps", async () => {
    mockHoboleaksResponse({ 1: "BasicAgent" });
    // The DB row matches the incoming record but also carries the two
    // Prisma-managed timestamps, which the local fetch must strip. Leaving
    // createdAt in made every row compare as "modified" on every run, rewriting
    // whole tables and churning updatedAt.
    agentType.findMany.mockResolvedValueOnce([
      {
        ...remoteRecord,
        createdAt: new Date("2017-06-01"),
        updatedAt: new Date("2017-06-01"),
      },
    ]);

    const result = await runJob();

    expect(agentType.update).not.toHaveBeenCalled();
    expect(agentType.createMany).toHaveBeenCalledWith({ data: [] });
    expect(result.stats.agentTypeChanges).toMatchObject({
      created: 0,
      modified: 0,
      equal: 1,
    });
  });

  it("updates a row when a real field changed", async () => {
    mockHoboleaksResponse({ 1: "BasicAgent" });
    agentType.findMany.mockResolvedValueOnce([
      {
        ...remoteRecord,
        name: "OldName",
        createdAt: new Date("2017-06-01"),
        updatedAt: new Date("2017-06-01"),
      },
    ]);

    const result = await runJob();

    expect(agentType.update).toHaveBeenCalledTimes(1);
    expect(agentType.update).toHaveBeenCalledWith({
      data: remoteRecord,
      where: { agentTypeId: 1 },
    });
    expect(result.stats.agentTypeChanges).toMatchObject({
      created: 0,
      modified: 1,
      equal: 0,
    });
  });
});
