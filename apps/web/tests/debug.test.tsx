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
  connection: jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue(undefined),
}));

const { env } = require("~/env") as { env: { NODE_ENV: string } };
const { DebugPageContent } = require("../app/debug/page");

describe("Debug Page", () => {
  afterEach(() => {
    for (const key of Object.keys(env)) {
      delete (env as Record<string, unknown>)[key];
    }
    env.NODE_ENV = "test";
  });

  it("throws notFound when in production", async () => {
    env.NODE_ENV = "production";
    await expect(DebugPageContent()).rejects.toThrow("NOT_FOUND");
  });

  it("never sends a secret to the browser", async () => {
    // A dev server reads the root .env, which holds production credentials,
    // and these props are serialised into the page.
    Object.assign(env, {
      NODE_ENV: "development",
      NEXTAUTH_SECRET: "nextauth-secret-value",
      EVE_CLIENT_SECRET: "eve-client-secret-value",
      CRON_SECRET: "cron-secret-value",
      DATABASE_URL: "postgresql://dbuser:db-password@db.example.com:26257/app",
      REDIS_URL: "rediss://default:redis-password@cache.example.com:6379",
    });

    const result = (await DebugPageContent()) as {
      props: { vars: Record<string, string | undefined> };
    };
    const sent = JSON.stringify(result.props);

    for (const secret of [
      "nextauth-secret-value",
      "eve-client-secret-value",
      "cron-secret-value",
      "db-password",
      "redis-password",
      "dbuser",
    ]) {
      expect(sent).not.toContain(secret);
    }
    // Still useful for debugging: which host, and whether a secret is set.
    expect(result.props.vars.DATABASE_URL).toContain("db.example.com:26257");
    expect(result.props.vars.CRON_SECRET).toBe("set (redacted)");
  });

  it("returns a page when not in production", async () => {
    env.NODE_ENV = "development";
    const result = await DebugPageContent();
    expect(result).toBeTruthy();
  });
});
