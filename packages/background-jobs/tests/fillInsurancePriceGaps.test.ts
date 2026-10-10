import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { JobLogger } from "../core";
import type { fillInsurancePriceGaps as FillInsurancePriceGaps } from "../jobs/scrape/everef/fillInsurancePriceGaps";

// @swc/jest doesn't hoist jest.mock, so the job is imported lazily.
let before: { observedAt: Date } | null;
let inWindow: { observedAt: Date }[];
jest.mock("../db", () => ({
  prisma: {
    insurancePriceSnapshot: {
      findFirst: () => Promise.resolve(before),
      findMany: () => Promise.resolve(inWindow),
    },
  },
}));

let fillInsurancePriceGaps: typeof FillInsurancePriceGaps;
beforeAll(async () => {
  ({ fillInsurancePriceGaps } =
    await import("../jobs/scrape/everef/fillInsurancePriceGaps"));
});

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} satisfies JobLogger;
const send = jest.fn((_id: string, _payload: unknown) => Promise.resolve());
const run = () =>
  fillInsurancePriceGaps.handler({
    payload: {},
    logger,
    send: (id: string, payload: unknown) => send(id, payload),
  } as never);

const NOW = new Date("2026-10-10T12:00:00Z");
const hoursAgo = (hours: number) =>
  new Date(NOW.getTime() - hours * 60 * 60 * 1000);
/** Hourly observations from `from` hours ago to `to` hours ago. */
const hourly = (from: number, to: number) =>
  Array.from({ length: from - to + 1 }, (_, i) => ({
    observedAt: hoursAgo(from - i),
  }));

/** The last observation before the week: 90 minutes before the next. */
const BEFORE = hoursAgo(24 * 7 + 0.5);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  before = { observedAt: BEFORE };
  inWindow = hourly(24 * 7 - 1, 0);
});
afterEach(() => {
  jest.useRealTimers();
});

describe("fillInsurancePriceGaps", () => {
  it("sends nothing for an unbroken week", async () => {
    await expect(run()).resolves.toEqual({
      stats: { gaps: 0, backfills: 0 },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends a backfill for each gap, including one up to now", async () => {
    inWindow = [...hourly(24 * 7 - 1, 50), ...hourly(40, 10)];
    await run();
    expect(send.mock.calls.map(([, payload]) => payload)).toEqual([
      { from: hoursAgo(50).toISOString(), to: hoursAgo(40).toISOString() },
      { from: hoursAgo(10).toISOString(), to: NOW.toISOString() },
    ]);
  });

  it("bounds a gap that straddles the window's start", async () => {
    inWindow = hourly(100, 0);
    await run();
    expect(send).toHaveBeenCalledWith("backfill-everef-insurance-prices", {
      from: BEFORE.toISOString(),
      to: hoursAgo(100).toISOString(),
    });
  });

  it("sends one backfill over many gaps", async () => {
    inWindow = Array.from({ length: 20 }, (_, i) => ({
      observedAt: hoursAgo(160 - i * 8),
    }));
    await run();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("backfill-everef-insurance-prices", {
      from: BEFORE.toISOString(),
      to: NOW.toISOString(),
    });
  });

  it("does nothing before the history was ever bootstrapped", async () => {
    before = null;
    inWindow = [];
    await run();
    expect(send).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
