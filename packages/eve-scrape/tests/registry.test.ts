import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { client as Client } from "../client";
import type { functions as Functions } from "../adapter";

// Mock the shared core so this adapter test doesn't pull in the 46 real job
// modules (and their Prisma/Redis/chat/ESI imports). We assert only that the
// adapter maps JobDefinitions onto the shared Inngest client correctly; the
// real registry membership is covered by @jitaspace/background-jobs' own tests.
jest.mock("@jitaspace/background-jobs", () => {
  const noop = () => Promise.resolve(undefined);
  const jobs = [
    { id: "alpha-job", name: "Alpha", trigger: { type: "event" }, handler: noop },
    {
      id: "beta-cron",
      name: "Beta",
      trigger: { type: "cron", cron: "TZ=UTC 0 * * * *" },
      singleton: true,
      retries: 0,
      handler: noop,
    },
    {
      id: "gamma-job",
      name: "Gamma",
      trigger: { type: "event" },
      concurrencyLimit: 5,
      retries: 3,
      handler: noop,
    },
  ];
  return {
    NonRetriableError: class NonRetriableError extends Error {},
    registry: {
      jobs,
      byId: new Map(jobs.map((job) => [job.id, job])),
      has: (id: string) => jobs.some((job) => job.id === id),
      get: (id: string) => jobs.find((job) => job.id === id),
    },
  };
});

let client: typeof Client;
let functions: typeof Functions;

beforeAll(async () => {
  client = (await import("../client")).client;
  functions = (await import("../adapter")).functions;
});

describe("eve-scrape Inngest adapter", () => {
  it("creates the shared client with id 'jitaspace'", () => {
    expect(client.id).toBe("jitaspace");
  });

  it("builds one Inngest function per job with unique, non-empty ids", () => {
    expect(Array.isArray(functions)).toBe(true);
    expect(functions.length).toBe(3);

    const ids = functions.map((fn) => fn.id());
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(
      true,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
