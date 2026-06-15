import { afterEach, describe, expect, it, jest } from "@jest/globals";

// @swc/jest does not hoist jest.mock above imports, so register the mock first
// and lazy-require the module under test. The debug page reads NODE_ENV from the
// validated `~/env` (not `process.env`); mock it so each test can control it.
jest.mock("~/env", () => ({ env: { NODE_ENV: "test" } }));

jest.mock("~/lib/db", () => ({
  prisma: {},
}));

jest.mock("~/lib/kv", () => ({
  kv: {
    queues: {},
  },
}));

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

jest.mock("next/server", () => ({
  connection: jest.fn().mockResolvedValue(undefined),
}));

const { env } = require("~/env") as { env: { NODE_ENV: string } };
const { DebugPageContent } = require("../app/debug/page");

describe("Debug Page", () => {
  afterEach(() => {
    env.NODE_ENV = "test";
  });

  it("throws notFound when in production", async () => {
    env.NODE_ENV = "production";
    await expect(DebugPageContent()).rejects.toThrow("NOT_FOUND");
  });

  it("returns a page when not in production", async () => {
    env.NODE_ENV = "development";
    const result = await DebugPageContent();
    expect(result).toBeTruthy();
  });
});
