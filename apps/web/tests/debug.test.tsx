import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { env } from "~/env.ts";

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

const { DebugPageContent } = require("../app/debug/page");

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
    await expect(DebugPageContent()).rejects.toThrow("NOT_FOUND");
  });

  it("returns a page when not in production", async () => {
    (process.env as any).NODE_ENV = "development";
    const result = await DebugPageContent();
    expect(result).toBeTruthy();
  });
});
