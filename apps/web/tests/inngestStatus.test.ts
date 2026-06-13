/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import type { InngestApiEvent } from "~/lib/inngestStatus";
import {
  buildInngestStatusResponse,
  collectTerminalRuns,
  jobNameFromSlug,
  ulidTimestamp,
} from "~/lib/inngestStatus";

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Build a syntactically valid ULID whose time component is `ms`. */
const ulidAt = (ms: number, suffix = "AAAAAAAAAAAAAAAA") => {
  let value = ms;
  let prefix = "";
  for (let i = 0; i < 10; i++) {
    prefix = ULID_ALPHABET[value % 32] + prefix;
    value = Math.floor(value / 32);
  }
  return prefix + suffix;
};

const T0 = Date.UTC(2026, 5, 10, 6, 0, 0); // queued
const T1 = Date.UTC(2026, 5, 10, 6, 5, 0); // ended
const T2 = Date.UTC(2026, 5, 10, 7, 0, 0); // a later run

const ALLIANCES_SLUG = "jitaspace-scrape-esi-alliances";
const WARS_SLUG = "jitaspace-esi-update-wars";

const finishedEvent = (overrides?: {
  runId?: string;
  status?: string;
  ts?: number;
  functionId?: string;
  error?: { name?: string; message?: string };
}): InngestApiEvent => ({
  internal_id: `EVT${overrides?.ts ?? T1}`,
  name: "inngest/function.finished",
  ts: overrides?.ts ?? T1,
  data: {
    function_id: overrides?.functionId ?? ALLIANCES_SLUG,
    run_id: overrides?.runId ?? ulidAt(T0),
    _inngest: { status: overrides?.status ?? "Completed" },
    ...(overrides?.error ? { error: overrides.error } : {}),
  },
});

describe("ulidTimestamp", () => {
  it("decodes the timestamp of a real Inngest run ID", () => {
    // Run created by the hourly cron at 2026-06-10T07:30:00Z.
    expect(ulidTimestamp("01KTR70960HQBXCQ2SVK2KH1EN")).toBe(
      Date.UTC(2026, 5, 10, 7, 30, 0),
    );
  });

  it("round-trips with the fixture encoder and rejects invalid input", () => {
    expect(ulidTimestamp(ulidAt(T0))).toBe(T0);
    expect(ulidTimestamp("not-a-ulid!")).toBeNull();
    expect(ulidTimestamp("short")).toBeNull();
  });
});

describe("jobNameFromSlug", () => {
  it("strips the app prefix, title-cases and uppercases known acronyms", () => {
    expect(jobNameFromSlug("jitaspace-scrape-esi-alliances")).toBe(
      "Scrape ESI Alliances",
    );
    expect(jobNameFromSlug("jitaspace-esi-update-wars")).toBe(
      "ESI Update Wars",
    );
    expect(jobNameFromSlug("jitaspace-process-redis-alliance-ids")).toBe(
      "Process Redis Alliance IDs",
    );
  });

  it("handles slugs without the app prefix", () => {
    expect(jobNameFromSlug("scrape-sde-agents")).toBe("Scrape SDE Agents");
  });
});

describe("collectTerminalRuns", () => {
  it("collects completed runs from finished events", () => {
    const runs = collectTerminalRuns([finishedEvent()]);
    const run = runs.get(ulidAt(T0));

    expect(runs.size).toBe(1);
    expect(run).toMatchObject({
      functionSlug: ALLIANCES_SLUG,
      status: "Completed",
      queuedAt: T0,
      endedAt: T1,
    });
  });

  it("merges failed events over finished events and keeps error details", () => {
    const runId = ulidAt(T0);
    const runs = collectTerminalRuns([
      finishedEvent({ runId, status: "Failed" }),
      {
        internal_id: "EVT-FAILED",
        name: "inngest/function.failed",
        ts: T1,
        data: {
          function_id: ALLIANCES_SLUG,
          run_id: runId,
          error: { name: "Error", message: "boom" },
        },
      },
    ]);

    expect(runs.get(runId)).toMatchObject({
      status: "Failed",
      errorName: "Error",
      errorMessage: "boom",
    });
  });

  it("ignores events without run metadata", () => {
    const runs = collectTerminalRuns([
      { internal_id: "EVT-EMPTY", name: "inngest/function.finished", ts: T1 },
      { internal_id: "EVT-OTHER", name: "scrape/esi/alliances", ts: T1 },
    ]);
    expect(runs.size).toBe(0);
  });
});

describe("buildInngestStatusResponse", () => {
  it("derives jobs from observed runs and computes totals", () => {
    const failedRunId = ulidAt(T1);
    const terminalRuns = collectTerminalRuns([
      finishedEvent(),
      finishedEvent({
        runId: failedRunId,
        status: "Failed",
        ts: T2,
        error: { name: "Error", message: "boom" },
      }),
      finishedEvent({
        runId: ulidAt(T2),
        ts: T2 + 60_000,
        functionId: WARS_SLUG,
      }),
    ]);

    const response = buildInngestStatusResponse({
      terminalRuns,
      fetchedAt: new Date(T2),
    });

    expect(response.totals).toEqual({
      jobs: 2,
      runs: 3,
      completed: 2,
      failed: 1,
      cancelled: 0,
    });

    // Jobs are sorted by most recent activity; names derive from slugs.
    expect(response.jobs.map((job) => job.id)).toEqual([
      WARS_SLUG,
      ALLIANCES_SLUG,
    ]);

    const alliances = response.jobs.find((job) => job.id === ALLIANCES_SLUG);
    expect(alliances?.name).toBe("Scrape ESI Alliances");
    expect(alliances?.counts).toEqual({
      completed: 1,
      failed: 1,
      cancelled: 0,
      total: 2,
    });
    // Newest run (the failure) is the last run.
    expect(alliances?.lastRun).toMatchObject({
      runId: failedRunId,
      status: "Failed",
      durationMs: T2 - T1,
      errorMessage: "boom",
    });
    expect(alliances?.recentRuns.map((run) => run.status)).toEqual([
      "Failed",
      "Completed",
    ]);
  });

  it("omits jobs without observed runs entirely", () => {
    const response = buildInngestStatusResponse({
      terminalRuns: collectTerminalRuns([finishedEvent()]),
      fetchedAt: new Date(T2),
    });

    expect(response.jobs).toHaveLength(1);
    expect(response.totals.jobs).toBe(1);
  });

  it("carries an error message with no jobs", () => {
    const response = buildInngestStatusResponse({
      terminalRuns: new Map(),
      fetchedAt: new Date(T2),
      error: "Inngest API responded with 500",
    });

    expect(response.error).toBe("Inngest API responded with 500");
    expect(response.jobs).toEqual([]);
    expect(response.totals).toEqual({
      jobs: 0,
      runs: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    });
  });
});
