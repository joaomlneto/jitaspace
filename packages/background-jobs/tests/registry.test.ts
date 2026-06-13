import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { jobs as Jobs, registry as Registry } from "../jobs";

// Importing the job registry pulls in external IO clients at module load
// (Prisma, the chat bot, ESI/SDE clients). Mock them so the import only
// executes the declarative `defineJob` config we assert on here. (`kv` is
// already lazy, so it has no import-time side effects, but we stub it anyway.)
jest.mock("../kv", () => ({ getKv: jest.fn(), getRedis: jest.fn() }));
jest.mock("../db", () => ({ prisma: {}, Prisma: {} }));
jest.mock("../chat", () => ({ postUpdateCard: jest.fn() }));
jest.mock("@jitaspace/esi-client", () => ({}));
jest.mock("@jitaspace/sde-client", () => ({}));
// p-limit is ESM-only and only used inside handlers, not in the registry config.
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

let jobs: typeof Jobs;
let registry: typeof Registry;

beforeAll(async () => {
  const mod = await import("../jobs");
  jobs = mod.jobs;
  registry = mod.registry;
});

const JOBS_DIR = join(__dirname, "..", "jobs");

const walkTsFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walkTsFiles(full);
    return full.endsWith(".ts") ? [full] : [];
  });

describe("background-jobs registry", () => {
  it("registers more than 40 jobs with unique, non-empty ids", () => {
    expect(jobs.length).toBeGreaterThan(40);
    const ids = jobs.map((job) => job.id);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(
      true,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every job a name and a valid trigger", () => {
    for (const job of jobs) {
      expect(typeof job.name).toBe("string");
      expect(job.name.length).toBeGreaterThan(0);
      expect(["event", "cron"]).toContain(job.trigger.type);
      if (job.trigger.type === "cron") {
        expect(typeof job.trigger.cron).toBe("string");
      }
    }
  });

  it("has exactly one cron job (updateWars)", () => {
    const cronJobIds = jobs
      .filter((job) => job.trigger.type === "cron")
      .map((job) => job.id);
    expect(cronJobIds).toEqual(["esi-update-wars"]);
  });

  it("resolves every job by id through the registry", () => {
    for (const job of jobs) {
      expect(registry.get(job.id)).toBe(job);
    }
  });

  // The big safety net for string-based references: scan the handler source for
  // every `ctx.send("…")` / `ctx.invoke("…")` target and assert it is a real
  // job id. A typo here would otherwise only blow up at runtime.
  it("references only job ids that exist (ctx.send / ctx.invoke)", () => {
    const referenced = new Set<string>();
    for (const file of walkTsFiles(JOBS_DIR)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /ctx\.(?:send|invoke)\(\s*["']([^"']+)["']/g,
      )) {
        const id = match[1];
        if (id) referenced.add(id);
      }
    }

    expect(referenced.size).toBeGreaterThan(0);
    const unknown = [...referenced].filter((id) => !registry.has(id));
    expect(unknown).toEqual([]);
  });
});
