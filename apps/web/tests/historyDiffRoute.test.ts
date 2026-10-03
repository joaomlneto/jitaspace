/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Exercises the build-diff API routes end to end through ~/lib/history-diff,
// with @jitaspace/db-builds stubbed so the real Prisma client never loads.
// `"use cache"` is inert under Jest, so every request reads the stub afresh.

type Op = "added" | "modified" | "removed";
type Server = "tranquility" | "singularity" | null;

let mockBuilds: {
  buildNumber: number;
  releasedAt: Date | null;
  server: Server;
}[] = [];
let mockDiffs: { id: number; fromBuild: number | null; toBuild: number }[] = [];
let mockChanges: {
  diffId: number;
  op: Op;
  kind: string;
  eveId: number;
  collection: string;
}[] = [];
// Every change-table read, so a test can prove a refused request never made
// one, and inspect the filters a read was made with.
let mockChangeReads: { method: string; where: unknown }[] = [];

const STRINGS = "strings:";

jest.mock("next/cache", () => ({ cacheLife: () => undefined }));

jest.mock("@jitaspace/db-builds", () => ({
  buildsDb: {
    build: { findMany: () => Promise.resolve(mockBuilds) },
    buildDiff: {
      // Honours the one filter the reader uses: genesis diffs excluded.
      findMany: () =>
        Promise.resolve(mockDiffs.filter((d) => d.fromBuild !== null)),
    },
    change: {
      findMany: (args: { where: { diffId: number } }) => {
        mockChangeReads.push({ method: "findMany", where: args.where });
        return Promise.resolve(
          mockChanges
            .filter(
              (c) =>
                c.diffId === args.where.diffId &&
                !c.collection.startsWith(STRINGS),
            )
            .map((c) => ({
              op: c.op,
              entity: { kind: c.kind, eveId: c.eveId },
              collection: { name: c.collection },
            })),
        );
      },
      groupBy: (args: { where: { diffId: { in: number[] } } }) => {
        mockChangeReads.push({ method: "groupBy", where: args.where });
        const counts = new Map<string, number>();
        for (const c of mockChanges) {
          if (!args.where.diffId.in.includes(c.diffId)) continue;
          if (c.collection.startsWith(STRINGS)) continue;
          const key = `${c.diffId} ${c.op}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return Promise.resolve(
          [...counts].map(([key, _count]) => {
            const [diffId, op] = key.split(" ");
            return { diffId: Number(diffId), op, _count };
          }),
        );
      },
    },
  },
}));

type Handler<P> = (
  request: Request,
  ctx: { params: Promise<P> },
) => Promise<Response>;

// Loaded lazily, after the mocks above are registered: @swc/jest does not hoist
// jest.mock above a top-level import.
const getDiff = (from: string, to: string) =>
  (
    require("../app/api/history/diff/[from]/[to]/route") as {
      GET: Handler<{ from: string; to: string }>;
    }
  ).GET(new Request(`https://www.jita.space/api/history/diff/${from}/${to}`), {
    params: Promise.resolve({ from, to }),
  });

const getBuild = (from: string) =>
  (
    require("../app/api/history/diff/[from]/route") as {
      GET: Handler<{ from: string }>;
    }
  ).GET(new Request(`https://www.jita.space/api/history/diff/${from}`), {
    params: Promise.resolve({ from }),
  });

beforeEach(() => {
  // 100 → 200 (tranquility) → 300 (tranquility), and 200 → 250 on Singularity
  // branching off it; 50 is a genesis snapshot with no baseline.
  mockBuilds = [
    { buildNumber: 50, releasedAt: null, server: null },
    {
      buildNumber: 100,
      releasedAt: new Date("2026-09-01T11:00:00Z"),
      server: "tranquility",
    },
    {
      buildNumber: 200,
      releasedAt: new Date("2026-09-08T11:00:00Z"),
      server: "tranquility",
    },
    {
      buildNumber: 250,
      releasedAt: new Date("2026-09-10T11:00:00Z"),
      server: "singularity",
    },
    {
      buildNumber: 300,
      releasedAt: new Date("2026-09-15T11:00:00Z"),
      server: "tranquility",
    },
  ];
  mockDiffs = [
    { id: 1, fromBuild: null, toBuild: 50 },
    { id: 2, fromBuild: 100, toBuild: 200 },
    { id: 3, fromBuild: 200, toBuild: 300 },
    { id: 4, fromBuild: 200, toBuild: 250 },
  ];
  mockChanges = [
    {
      diffId: 2,
      op: "modified",
      kind: "type",
      eveId: 587,
      collection: "types",
    },
    {
      diffId: 2,
      op: "added",
      kind: "type",
      eveId: 34,
      collection: "typeDogma",
    },
    { diffId: 2, op: "added", kind: "type", eveId: 2, collection: "types" },
    {
      diffId: 2,
      op: "removed",
      kind: "skin",
      eveId: 12747,
      collection: "skins",
    },
    // Localization strings are not part of the API.
    {
      diffId: 2,
      op: "modified",
      kind: "string:en",
      eveId: 9,
      collection: "strings:en",
    },
    {
      diffId: 3,
      op: "modified",
      kind: "type",
      eveId: 587,
      collection: "types",
    },
    { diffId: 4, op: "added", kind: "type", eveId: 99, collection: "types" },
    { diffId: 4, op: "added", kind: "type", eveId: 98, collection: "types" },
  ];
  mockChangeReads = [];
});

describe("GET /api/history/diff/[from]/[to]", () => {
  it("serves a stored diff's entity changes, sorted, with a summary", async () => {
    const res = await getDiff("100", "200");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      from: { build: 100, date: "2026-09-01", server: "tranquility" },
      to: { build: 200, date: "2026-09-08", server: "tranquility" },
      summary: { added: 2, modified: 1, removed: 1 },
      changes: [
        {
          collection: "skins",
          entityType: "skin",
          entityId: 12747,
          op: "removed",
        },
        {
          collection: "typeDogma",
          entityType: "type",
          entityId: 34,
          op: "added",
        },
        { collection: "types", entityType: "type", entityId: 2, op: "added" },
        {
          collection: "types",
          entityType: "type",
          entityId: 587,
          op: "modified",
        },
      ],
    });
    expect(mockChangeReads).toEqual([
      {
        method: "findMany",
        where: {
          diffId: 2,
          collection: { name: { not: { startsWith: STRINGS } } },
        },
      },
    ]);
  });

  it("lets the CDN cache a diff", async () => {
    const res = await getDiff("100", "200");

    expect(res.headers.get("cache-control")).toMatch(/\bpublic\b/);
    expect(res.headers.get("cache-control")).toMatch(/\bs-maxage=86400\b/);
  });

  it("serves Singularity diffs too", async () => {
    const res = await getDiff("200", "250");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      to: { build: 250, server: "singularity" },
      summary: { added: 2, modified: 0, removed: 0 },
    });
  });

  it.each([
    ["two builds with no stored diff between them", "100", "300"],
    ["a reversed pair", "200", "100"],
    ["an unknown build", "100", "999"],
  ])("404s on %s without reading any changes", async (_label, from, to) => {
    const res = await getDiff(from, to);

    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toMatch(/\bs-maxage=300\b/);
    expect(((await res.json()) as { error: string }).error).toContain(
      `/api/history/diff/${from}`,
    );
    expect(mockChangeReads).toEqual([]);
  });

  it.each([
    ["a non-numeric build", "abc", "200"],
    ["a non-canonical spelling", "0100", "200"],
    ["build 0", "0", "200"],
    ["a build past INT4", "100", "2147483648"],
  ])("400s on %s", async (_label, from, to) => {
    const res = await getDiff(from, to);

    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBeNull();
    expect(mockChangeReads).toEqual([]);
  });

  it("lets a database failure throw rather than answer", async () => {
    const { buildsDb } = jest.requireMock<{
      buildsDb: { buildDiff: { findMany: () => Promise<unknown> } };
    }>("@jitaspace/db-builds");
    const spy = jest
      .spyOn(buildsDb.buildDiff, "findMany")
      .mockRejectedValueOnce(new Error("connection refused"));

    await expect(getDiff("100", "200")).rejects.toThrow("connection refused");
    spy.mockRestore();
  });
});

describe("GET /api/history/diff/[build]", () => {
  it("lists the diffs into and out of a build, with summaries and URLs", async () => {
    const res = await getBuild("200");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      build: 200,
      date: "2026-09-08",
      server: "tranquility",
      from: [
        {
          build: 100,
          date: "2026-09-01",
          server: "tranquility",
          summary: { added: 2, modified: 1, removed: 1 },
          url: "/api/history/diff/100/200",
        },
      ],
      to: [
        {
          build: 250,
          date: "2026-09-10",
          server: "singularity",
          summary: { added: 2, modified: 0, removed: 0 },
          url: "/api/history/diff/200/250",
        },
        {
          build: 300,
          date: "2026-09-15",
          server: "tranquility",
          summary: { added: 0, modified: 1, removed: 0 },
          url: "/api/history/diff/200/300",
        },
      ],
    });
    // One grouped count for all three diffs, strings excluded.
    expect(mockChangeReads).toEqual([
      {
        method: "groupBy",
        where: {
          diffId: { in: [2, 3, 4] },
          collection: { name: { not: { startsWith: STRINGS } } },
        },
      },
    ]);
  });

  it("does not list genesis diffs, which no pair can address", async () => {
    const res = await getBuild("50");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      build: 50,
      date: null,
      server: null,
      from: [],
      to: [],
    });
    expect(mockChangeReads).toEqual([]);
  });

  it("lets the CDN cache a build's listing for an hour", async () => {
    const res = await getBuild("200");

    expect(res.headers.get("cache-control")).toMatch(/\bs-maxage=3600\b/);
  });

  it("404s on an unknown build without reading any changes", async () => {
    const res = await getBuild("999");

    expect(res.status).toBe(404);
    expect(mockChangeReads).toEqual([]);
  });

  it("400s on a malformed build", async () => {
    const res = await getBuild("12abc");

    expect(res.status).toBe(400);
  });
});
