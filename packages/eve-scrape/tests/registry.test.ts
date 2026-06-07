import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { client as Client, functions as Functions } from "../index";

// Importing the function registry pulls in external IO clients at module load
// (Prisma, Redis, ESI/SDE API clients, chat). Mock them so the import only
// executes the declarative Inngest config (eventType / triggers) we care about
// here. Mocks are registered before the dynamic import below, so the registry
// resolves these stubs instead of the real modules.
jest.mock("../kv", () => ({ redis: {}, kv: { queues: {} } }));
jest.mock("../db", () => ({ prisma: {}, Prisma: {} }));
jest.mock("@jitaspace/esi-client", () => ({}));
jest.mock("@jitaspace/sde-client", () => ({}));
jest.mock("../chat", () => ({ postUpdateCard: jest.fn() }));
// p-limit is ESM-only and only used inside handlers, not in the registry config.
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

let client: typeof Client;
let functions: typeof Functions;

beforeAll(async () => {
  const mod = await import("../index");
  client = mod.client;
  functions = mod.functions;
});

describe("eve-scrape Inngest registry", () => {
  it("creates the shared client", () => {
    expect(client.id).toBe("jitaspace");
  });

  it("registers every function with a unique, non-empty id", () => {
    expect(Array.isArray(functions)).toBe(true);
    expect(functions.length).toBeGreaterThan(40);

    const ids = functions.map((fn) => fn.id());
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(
      true,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
