/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import type { TriggerApiRun } from "~/lib/triggerStatus";
import {
  buildTriggerStatusResponse,
  jobNameFromId,
  mapTriggerStatus,
  summarizeRun,
} from "~/lib/triggerStatus";

const iso = (y: number, mo: number, d: number, h: number, mi: number) =>
  new Date(Date.UTC(y, mo, d, h, mi, 0)).toISOString();

const run = (overrides: Partial<TriggerApiRun> = {}): TriggerApiRun => ({
  id: "run_1",
  taskIdentifier: "scrape-esi-alliances",
  status: "COMPLETED",
  createdAt: iso(2026, 5, 10, 6, 0),
  finishedAt: iso(2026, 5, 10, 6, 5),
  durationMs: 5 * 60 * 1000,
  ...overrides,
});

describe("jobNameFromId", () => {
  it("title-cases and applies acronyms", () => {
    expect(jobNameFromId("scrape-esi-alliances")).toBe("Scrape ESI Alliances");
    expect(jobNameFromId("scrape-sde-npc-corporation-divisions")).toBe(
      "Scrape SDE NPC Corporation Divisions",
    );
    expect(jobNameFromId("backfill-evekill-character-ids")).toBe(
      "Backfill Evekill Character IDs",
    );
  });
});

describe("mapTriggerStatus", () => {
  it("maps Trigger.dev statuses to the four buckets", () => {
    expect(mapTriggerStatus("COMPLETED")).toBe("Completed");
    expect(mapTriggerStatus("CANCELED")).toBe("Cancelled");
    expect(mapTriggerStatus("FAILED")).toBe("Failed");
    expect(mapTriggerStatus("CRASHED")).toBe("Failed");
    expect(mapTriggerStatus("SYSTEM_FAILURE")).toBe("Failed");
    expect(mapTriggerStatus("EXECUTING")).toBe("Running");
    expect(mapTriggerStatus("QUEUED")).toBe("Running");
  });
});

describe("summarizeRun", () => {
  it("derives duration from timestamps when durationMs is missing", () => {
    const summary = summarizeRun(
      run({
        durationMs: 0,
        createdAt: iso(2026, 5, 10, 6, 0),
        finishedAt: iso(2026, 5, 10, 6, 2),
      }),
    );
    expect(summary.durationMs).toBe(2 * 60 * 1000);
    expect(summary.status).toBe("Completed");
  });

  it("leaves duration null for a running run", () => {
    const summary = summarizeRun(
      run({ status: "EXECUTING", finishedAt: null, durationMs: 0 }),
    );
    expect(summary.status).toBe("Running");
    expect(summary.endedAt).toBeNull();
    expect(summary.durationMs).toBeNull();
  });
});

describe("buildTriggerStatusResponse", () => {
  it("groups runs by task and computes counts/totals", () => {
    const runs: TriggerApiRun[] = [
      run({ id: "run_a", taskIdentifier: "scrape-esi-alliances" }),
      run({
        id: "run_b",
        taskIdentifier: "scrape-esi-alliances",
        status: "FAILED",
        createdAt: iso(2026, 5, 10, 7, 0),
        finishedAt: iso(2026, 5, 10, 7, 1),
      }),
      run({
        id: "run_c",
        taskIdentifier: "esi-update-wars",
        status: "EXECUTING",
        finishedAt: null,
      }),
    ];
    const response = buildTriggerStatusResponse({
      runs,
      fetchedAt: new Date(Date.UTC(2026, 5, 10, 8, 0, 0)),
    });

    expect(response.totals.jobs).toBe(2);
    expect(response.totals.runs).toBe(3);
    expect(response.totals.failed).toBe(1);
    expect(response.totals.running).toBe(1);

    const alliances = response.jobs.find(
      (job) => job.id === "scrape-esi-alliances",
    );
    expect(alliances?.name).toBe("Scrape ESI Alliances");
    expect(alliances?.counts.total).toBe(2);
    expect(alliances?.counts.failed).toBe(1);
    // run_b (ended 7:01) is the latest run → the failed status sorts it first.
    expect(alliances?.lastRun?.status).toBe("Failed");
    expect(response.jobs[0]?.id).toBe("scrape-esi-alliances");
  });

  it("returns an error payload with no jobs", () => {
    const response = buildTriggerStatusResponse({
      runs: [],
      fetchedAt: new Date(Date.UTC(2026, 5, 10, 8, 0, 0)),
      error: "TRIGGER_SECRET_KEY is not configured.",
    });
    expect(response.error).toBe("TRIGGER_SECRET_KEY is not configured.");
    expect(response.jobs).toEqual([]);
    expect(response.totals.jobs).toBe(0);
  });
});
