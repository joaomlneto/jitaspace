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

jest.mock("../layouts", () => ({
  MainLayout: ({ children }: any) => children,
}));

const { getStaticProps } = require("../pages/debug");

describe("Debug Page", () => {
  const originalEnv = env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns notFound: true when in production", async () => {
    (process.env as any).NODE_ENV = "production";
    const result = await getStaticProps({} as any);
    expect(result).toEqual({
      notFound: true,
    });
  });

  it("returns props when not in production", async () => {
    (process.env as any).NODE_ENV = "development";
    const result = await getStaticProps({} as any);
    expect(result).toHaveProperty("props");
    expect(result.props.vars.NODE_ENV).toBe("development");
  });
});
