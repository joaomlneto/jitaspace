import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { env } from "~/env.ts";

jest.mock("@jitaspace/db", () => ({
  prisma: {},
}));

jest.mock("@jitaspace/kv", () => ({
  kv: {
    queues: {},
  },
}));

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const DebugPage = require("../app/debug/page").default;

describe("Debug Page", () => {
  const originalEnv = env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws notFound when in production", async () => {
    (process.env as any).NODE_ENV = "production";
    await expect(DebugPage()).rejects.toThrow("NOT_FOUND");
  });

  it("returns a page when not in production", async () => {
    (process.env as any).NODE_ENV = "development";
    const result = await DebugPage();
    expect(result).toBeTruthy();
  });
});
