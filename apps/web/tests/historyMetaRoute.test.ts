/**
 * @jest-environment node
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

// Exercises GET /api/history through ~/lib/history-meta with the history DB
// and CCP's build pointers stubbed. `"use cache"` is inert under Jest.

type Server = "tranquility" | "singularity" | null;

let mockBuilds: {
  buildNumber: number;
  releasedAt: Date | null;
  server: Server;
}[] = [];
let mockDiffs: { toBuild: number; createdAt: Date }[] = [];
const mockCaptureException = jest.fn();
const mockConnection = jest.fn(() => Promise.resolve());

jest.mock("next/cache", () => ({ cacheLife: () => undefined }));
jest.mock("next/server", () => ({ connection: () => mockConnection() }));
jest.mock("@sentry/nextjs", () => ({
  captureException: (error: unknown) => mockCaptureException(error),
}));

jest.mock("@jitaspace/db-builds", () => ({
  buildsDb: {
    build: {
      groupBy: (args: { where: { server: { in: Server[] } } }) => {
        const out = new Map<Server, { count: number; max: number }>();
        for (const b of mockBuilds) {
          if (!args.where.server.in.includes(b.server)) continue;
          const g = out.get(b.server) ?? { count: 0, max: 0 };
          out.set(b.server, {
            count: g.count + 1,
            max: Math.max(g.max, b.buildNumber),
          });
        }
        return Promise.resolve(
          [...out].map(([server, g]) => ({
            server,
            _count: g.count,
            _max: { buildNumber: g.max },
          })),
        );
      },
      findMany: (args: { where: { buildNumber: { in: number[] } } }) =>
        Promise.resolve(
          mockBuilds.filter((b) =>
            args.where.buildNumber.in.includes(b.buildNumber),
          ),
        ),
    },
    buildDiff: {
      findMany: (args: { where: { toBuild: { in: number[] } } }) =>
        Promise.resolve(
          mockDiffs.filter((d) => args.where.toBuild.in.includes(d.toBuild)),
        ),
    },
  },
}));

// CCP's pointer per URL suffix: a build number, an HTTP status, or a throw.
let mockPointers: Record<string, number | { status: number } | "throw"> = {};
const realFetch = global.fetch;

const loadGET = () =>
  (
    require("../app/api/history/route") as {
      GET: () => Promise<Response>;
    }
  ).GET;

beforeEach(() => {
  mockBuilds = [
    { buildNumber: 80313, releasedAt: null, server: null },
    {
      buildNumber: 3561556,
      releasedAt: new Date("2026-09-30T11:00:00Z"),
      server: "tranquility",
    },
    {
      buildNumber: 3569502,
      releasedAt: new Date("2026-10-02T11:00:00Z"),
      server: "singularity",
    },
    {
      buildNumber: 3573966,
      releasedAt: new Date("2026-10-03T11:00:00Z"),
      server: "singularity",
    },
  ];
  mockDiffs = [
    { toBuild: 3561556, createdAt: new Date("2026-09-30T12:01:00Z") },
    { toBuild: 3569502, createdAt: new Date("2026-10-02T12:15:00Z") },
    { toBuild: 3573966, createdAt: new Date("2026-10-03T11:45:00Z") },
  ];
  mockPointers = { "TQ.json": 3569502, "SISI.json": 3573966 };
  mockCaptureException.mockReset();
  mockConnection.mockClear();
  global.fetch = ((url: string) => {
    const key = Object.keys(mockPointers).find((k) => url.endsWith(k));
    const p = key ? mockPointers[key] : { status: 404 };
    if (p === "throw") return Promise.reject(new Error("timeout"));
    if (typeof p === "object")
      return Promise.resolve(new Response("nope", { status: p.status }));
    return Promise.resolve(
      Response.json({ build: String(p), buildNumber: String(p) }),
    );
  }) as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
});

describe("GET /api/history", () => {
  it("reports each tracked server's live and newest recorded build", async () => {
    const res = await loadGET()();

    expect(res.status).toBe(200);
    expect(mockConnection).toHaveBeenCalled();
    expect(await res.json()).toEqual({
      servers: [
        {
          server: "tranquility",
          // Tranquility runs a build first seen on Singularity, so it keeps
          // that label and the newest `tranquility` build trails it.
          live: { build: 3569502, recorded: true, recordedAs: "singularity" },
          latest: {
            build: 3561556,
            date: "2026-09-30",
            recordedAt: "2026-09-30T12:01:00.000Z",
            url: "/api/history/diff/3561556",
          },
          buildCount: 1,
        },
        {
          server: "singularity",
          live: { build: 3573966, recorded: true, recordedAs: "singularity" },
          latest: {
            build: 3573966,
            date: "2026-10-03",
            recordedAt: "2026-10-03T11:45:00.000Z",
            url: "/api/history/diff/3573966",
          },
          buildCount: 2,
        },
      ],
      endpoints: {
        build: "/api/history/diff/{build}",
        diff: "/api/history/diff/{from}/{to}",
      },
    });
    expect(res.headers.get("cache-control")).toMatch(/\bs-maxage=300\b/);
  });

  it("says when a live build has not been recorded yet", async () => {
    mockPointers["SISI.json"] = 3580000;

    const body = (await (await loadGET()()).json()) as {
      servers: { live: unknown }[];
    };

    expect(body.servers[1]?.live).toEqual({
      build: 3580000,
      recorded: false,
      recordedAs: null,
    });
  });

  it.each([
    ["answers an error", { status: 503 }],
    ["does not answer", "throw" as const],
  ])(
    "degrades the live build to null, and reports it, when CCP %s",
    async (_label, pointer) => {
      mockPointers["TQ.json"] = pointer;

      const res = await loadGET()();
      const body = (await res.json()) as {
        servers: { live: unknown; latest: { build: number } }[];
      };

      expect(res.status).toBe(200);
      expect(body.servers[0]?.live).toBeNull();
      expect(body.servers[0]?.latest.build).toBe(3561556);
      expect(mockCaptureException).toHaveBeenCalledTimes(1);
    },
  );

  it("reports a server with no recorded builds as empty", async () => {
    mockBuilds = mockBuilds.filter((b) => b.server !== "singularity");

    const body = (await (await loadGET()()).json()) as {
      servers: { latest: unknown; buildCount: number }[];
    };

    expect(body.servers[1]).toMatchObject({ latest: null, buildCount: 0 });
  });
});
