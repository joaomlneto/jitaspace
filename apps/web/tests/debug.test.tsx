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

const { env } = require("~/env") as { env: Record<string, string | undefined> };
const { DebugPageContent } = require("../app/debug/page") as {
  DebugPageContent: () => Promise<{ props: { vars: Record<string, string> } }>;
};

describe("Debug Page", () => {
  afterEach(() => {
    for (const key of Object.keys(env)) delete env[key];
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

  it("never puts a raw secret into the props sent to the client", async () => {
    const secrets = {
      NEXTAUTH_SECRET: "nextauth-secret-plaintext",
      EVE_CLIENT_SECRET: "eve-client-secret-plaintext",
      CRON_SECRET: "cron-secret-plaintext",
      TRIGGER_SECRET_KEY: "tr_dev_trigger-secret-plaintext",
      DATABASE_URL:
        "postgresql://jita_app:db-password-plaintext@db.example.com:5432/jitaspace",
      REDIS_URL:
        "redis://default:redis-password-plaintext@redis.example.com:6379",
    };
    env.NODE_ENV = "development";
    Object.assign(env, secrets);

    const result = await DebugPageContent();
    const serialized = JSON.stringify(result.props);

    // The RSC flight payload is built from these props, so a raw value here
    // reaches the browser whether or not page.client.tsx renders it.
    for (const raw of Object.values(secrets)) {
      expect(serialized).not.toContain(raw);
    }
    expect(serialized).not.toContain("db-password-plaintext");
    expect(serialized).not.toContain("redis-password-plaintext");

    // …while the parts that make the page worth loading survive.
    expect(result.props.vars.NEXTAUTH_SECRET).toMatch(
      /^set · \d+ chars · sha256:[0-9a-f]{12}$/,
    );
    expect(result.props.vars.DATABASE_URL).toContain(
      "db.example.com:5432/jitaspace",
    );
  });
});
