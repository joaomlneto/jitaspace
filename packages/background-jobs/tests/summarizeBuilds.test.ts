import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { summarizeBuilds as SummarizeBuilds } from "../jobs/summarize/summarizeBuilds";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the job is imported lazily in beforeAll. Both
// databases, the env and the model call are stubbed — what is under test is the
// selection loop: which builds a run picks, which of them spend one of its five
// model calls, and what it records.

interface BuildRow {
  buildNumber: number;
  releasedAt: Date | null;
}
interface ChangeRow {
  op: "added" | "modified" | "removed";
  collection: { name: string };
  entity: { kind: string; eveId: number; name: string | null };
}

let buildRows: BuildRow[] = [];
let diffRows: { fromBuild: number | null }[] = [];
let changesByBuild = new Map<number, ChangeRow[]>();
let summaryRows: { buildNumber: number }[] = [];

const upsert = jest.fn((args: unknown) => Promise.resolve(args));

/** Per-kind name lookups, so each `resolveSampleNames` branch can be driven. */
const sampleNames = {
  type: jest.fn<() => Promise<unknown[]>>(),
  skin: jest.fn<() => Promise<unknown[]>>(),
  marketGroup: jest.fn<() => Promise<unknown[]>>(),
  dogmaAttribute: jest.fn<() => Promise<unknown[]>>(),
};
const summarizeBuild = jest.fn<() => Promise<string | null>>();

let apiKey: string | undefined = "test-key";

jest.mock("../env", () => ({
  get env() {
    return { ANTHROPIC_API_KEY: apiKey };
  },
}));

jest.mock("@jitaspace/db-history", () => ({
  historyDb: {
    build: { findMany: () => Promise.resolve(buildRows) },
    buildDiff: { findMany: () => Promise.resolve(diffRows) },
    change: {
      findMany: (args: { where: { diff: { toBuild: number } } }) =>
        Promise.resolve(changesByBuild.get(args.where.diff.toBuild) ?? []),
    },
  },
}));

jest.mock("../db", () => ({
  prisma: {
    buildSummary: {
      findMany: () => Promise.resolve(summaryRows),
      upsert: (args: unknown) => upsert(args),
    },
    type: { findMany: () => sampleNames.type() },
    skin: { findMany: () => sampleNames.skin() },
    marketGroup: { findMany: () => sampleNames.marketGroup() },
    dogmaAttribute: { findMany: () => sampleNames.dogmaAttribute() },
  },
}));

jest.mock("../jobs/summarize/summarize", () => {
  // Keep the real PROMPT_VERSION and SUMMARY_MODEL — the job writes both into
  // the row it upserts — and stub only the model call.
  const actual = jest.requireActual<
    typeof import("../jobs/summarize/summarize")
  >("../jobs/summarize/summarize");
  return { ...actual, summarizeBuild: () => summarizeBuild() };
});

let summarizeBuilds: typeof SummarizeBuilds;

beforeAll(async () => {
  ({ summarizeBuilds } = await import("../jobs/summarize/summarizeBuilds"));
});

const run = () => {
  const ctx = {
    payload: {},
    attempt: 1,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    send: jest.fn(),
    invoke: jest.fn(),
    run: (_name: string, fn: () => unknown) => fn(),
    sleep: jest.fn(),
  } as unknown as Parameters<typeof summarizeBuilds.handler>[0];
  return summarizeBuilds.handler(ctx);
};

/** A build whose digest has one real change, so it is worth summarizing. */
const withChanges = (buildNumber: number): [number, ChangeRow[]] => [
  buildNumber,
  [
    {
      op: "added",
      collection: { name: "types" },
      entity: { kind: "type", eveId: 587, name: "Rifter" },
    },
  ],
];

/** A build whose only changes are localisation strings — digest comes out empty. */
const stringsOnly = (buildNumber: number): [number, ChangeRow[]] => [
  buildNumber,
  [],
];

beforeEach(() => {
  apiKey = "test-key";
  buildRows = [];
  diffRows = [{ fromBuild: 3389104 }];
  changesByBuild = new Map();
  summaryRows = [];
  upsert.mockClear();
  sampleNames.type.mockResolvedValue([{ name: "Rifter" }]);
  sampleNames.skin.mockResolvedValue([{ internalName: "rifterSKIN" }]);
  sampleNames.marketGroup.mockResolvedValue([{ name: "Frigates" }]);
  sampleNames.dogmaAttribute.mockResolvedValue([
    { displayName: "  ", name: "powerOutput" },
  ]);
  summarizeBuild.mockReset();
  summarizeBuild.mockResolvedValue("Adds four ships.");
});

describe("summarize-builds", () => {
  it("no-ops when the API key is unset", async () => {
    apiKey = undefined;
    buildRows = [{ buildNumber: 1, releasedAt: null }];
    await expect(run()).resolves.toMatchObject({
      reason: "no-api-key",
      generated: 0,
    });
    expect(summarizeBuild).not.toHaveBeenCalled();
  });

  it("no-ops when the history database has no builds in scope", async () => {
    await expect(run()).resolves.toMatchObject({ reason: "no-builds" });
  });

  it("writes a summary for a build that has changes", async () => {
    buildRows = [{ buildNumber: 3401877, releasedAt: new Date("2026-08-19") }];
    changesByBuild = new Map([withChanges(3401877)]);

    await expect(run()).resolves.toMatchObject({
      candidates: 1,
      generated: 1,
      skipped: 0,
      failed: 0,
    });
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("skips builds that already have a current summary", async () => {
    buildRows = [{ buildNumber: 10, releasedAt: null }];
    changesByBuild = new Map([withChanges(10)]);
    summaryRows = [{ buildNumber: 10 }];

    await expect(run()).resolves.toMatchObject({
      candidates: 0,
      generated: 0,
    });
    expect(summarizeBuild).not.toHaveBeenCalled();
  });

  it("leaves a build for a later run when the model returns nothing usable", async () => {
    buildRows = [{ buildNumber: 20, releasedAt: null }];
    changesByBuild = new Map([withChanges(20)]);
    summarizeBuild.mockResolvedValue(null);

    await expect(run()).resolves.toMatchObject({
      generated: 0,
      skipped: 1,
      failed: 0,
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("counts a throwing build as failed without stranding the rest", async () => {
    buildRows = [
      { buildNumber: 31, releasedAt: null },
      { buildNumber: 30, releasedAt: null },
    ];
    changesByBuild = new Map([withChanges(31), withChanges(30)]);
    summarizeBuild
      .mockRejectedValueOnce(new Error("api down"))
      .mockResolvedValue("Adds four ships.");

    await expect(run()).resolves.toMatchObject({
      generated: 1,
      failed: 1,
    });
  });

  it("generates at most MAX_PER_RUN summaries in one run", async () => {
    buildRows = Array.from({ length: 8 }, (_, i) => ({
      buildNumber: 100 + i,
      releasedAt: null,
    }));
    changesByBuild = new Map(buildRows.map((b) => withChanges(b.buildNumber)));

    await expect(run()).resolves.toMatchObject({
      candidates: 8,
      generated: 5,
    });
    expect(summarizeBuild).toHaveBeenCalledTimes(5);
  });

  // The starvation guard: a build with nothing to describe is deterministic —
  // it will be empty on every future run too. If such builds spent one of the
  // five slots, a few of them at the head of the (newest-first) queue would
  // consume every run forever and the backlog would never drain.
  it("does not spend a model call on a build with nothing to describe", async () => {
    buildRows = Array.from({ length: 8 }, (_, i) => ({
      buildNumber: 200 + i,
      releasedAt: null,
    }));
    // The three newest have no describable changes.
    changesByBuild = new Map([
      stringsOnly(207),
      stringsOnly(206),
      stringsOnly(205),
      ...buildRows.slice(3).map((b) => withChanges(b.buildNumber)),
    ]);

    const result = await run();
    // Still five real summaries, despite three empty builds ahead of them.
    expect(result).toMatchObject({ generated: 5, skipped: 3 });
    expect(summarizeBuild).toHaveBeenCalledTimes(5);
  });

  it("bounds how many builds one run will examine", async () => {
    // Every build is empty, so no slot is ever spent; the scan cap is what
    // stops the run walking the entire history.
    buildRows = Array.from({ length: 200 }, (_, i) => ({
      buildNumber: 1000 + i,
      releasedAt: null,
    }));
    changesByBuild = new Map(buildRows.map((b) => stringsOnly(b.buildNumber)));

    const result = await run();
    expect(result.generated).toBe(0);
    expect(result.skipped).toBe(50);
  });

  it("samples names from every collection worth naming", async () => {
    buildRows = [{ buildNumber: 40, releasedAt: null }];
    changesByBuild = new Map([
      [
        40,
        [
          {
            op: "added" as const,
            collection: { name: "types" },
            entity: { kind: "type", eveId: 587, name: null },
          },
          {
            op: "added" as const,
            collection: { name: "skins" },
            entity: { kind: "skin", eveId: 1, name: null },
          },
          {
            op: "added" as const,
            collection: { name: "marketGroups" },
            entity: { kind: "marketGroup", eveId: 4, name: null },
          },
          {
            op: "added" as const,
            collection: { name: "dogmaAttributes" },
            entity: { kind: "dogmaAttribute", eveId: 30, name: null },
          },
          // Not a sampled collection — must not trigger a name lookup.
          {
            op: "added" as const,
            collection: { name: "blueprints" },
            entity: { kind: "blueprint", eveId: 99, name: null },
          },
        ],
      ],
    ]);

    await expect(run()).resolves.toMatchObject({ generated: 1 });
    expect(sampleNames.type).toHaveBeenCalled();
    expect(sampleNames.skin).toHaveBeenCalled();
    expect(sampleNames.marketGroup).toHaveBeenCalled();
    expect(sampleNames.dogmaAttribute).toHaveBeenCalled();
  });

  it("still summarizes when a name lookup fails", async () => {
    buildRows = [{ buildNumber: 50, releasedAt: null }];
    changesByBuild = new Map([withChanges(50)]);
    sampleNames.type.mockRejectedValue(new Error("names table missing"));

    // Names are flavour: a failed lookup means a vaguer sentence, not a lost
    // build.
    await expect(run()).resolves.toMatchObject({ generated: 1, failed: 0 });
  });
});
