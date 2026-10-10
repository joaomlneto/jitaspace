import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { InsurancePricesGet } from "@jitaspace/esi-client";

import type { JobLogger } from "../core";
import type { trackInsurancePrices as TrackInsurancePrices } from "../jobs/scrape/esi/trackInsurancePrices";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the module is imported lazily in beforeAll.
let esiList: InsurancePricesGet;
let lastModified: string | undefined;
const getInsurancePrices = jest.fn((_headers?: unknown, _config?: unknown) =>
  Promise.resolve({
    data: esiList,
    headers: { "last-modified": lastModified },
  }),
);
jest.mock("@jitaspace/esi-client", () => ({
  getInsurancePrices: (headers?: unknown, config?: unknown) =>
    getInsurancePrices(headers, config),
}));

let previous: { observedAt: Date } | null;
jest.mock("../db", () => ({
  prisma: {
    insurancePriceSnapshot: { findFirst: () => Promise.resolve(previous) },
  },
}));

let recorded: boolean;
const record = jest.fn((_observation: unknown) =>
  Promise.resolve({ recorded, changedTypes: 3, snapshots: 1 }),
);
jest.mock("../helpers/recordInsurancePriceSnapshot.ts", () => ({
  recordInsurancePriceSnapshot: (observation: unknown) => record(observation),
}));

let trackInsurancePrices: typeof TrackInsurancePrices;
beforeAll(async () => {
  ({ trackInsurancePrices } =
    await import("../jobs/scrape/esi/trackInsurancePrices"));
});

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} satisfies JobLogger;
const send = jest.fn((_id: string, _payload: unknown) => Promise.resolve());
const run = () =>
  trackInsurancePrices.handler({
    payload: {},
    logger,
    send: (id: string, payload: unknown) => send(id, payload),
  } as never);

beforeEach(() => {
  esiList = [
    {
      type_id: 587,
      levels: [{ name: "Basic", cost: 1000, payout: 10000 }],
    },
  ];
  lastModified = "Sat, 10 Oct 2026 19:31:33 GMT";
  previous = { observedAt: new Date("2026-10-10T18:31:33Z") };
  recorded = true;
});

describe("trackInsurancePrices", () => {
  it("records the list as of ESI's Last-Modified, in English", async () => {
    const result = await run();
    expect(getInsurancePrices.mock.calls[0]?.[1]).toMatchObject({
      acceptLanguage: "en",
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        observedAt: new Date("2026-10-10T19:31:33Z"),
        source: "esi",
      }),
    );
    expect(send).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      stats: { recorded: true, types: 1, changedTypes: 3, gapFilled: false },
    });
  });

  it("asks EVE Ref to fill a gap since the last observation", async () => {
    previous = { observedAt: new Date("2026-10-10T12:00:00Z") };
    await run();
    expect(send).toHaveBeenCalledWith("backfill-everef-insurance-prices", {
      from: "2026-10-10T12:00:00.000Z",
      to: "2026-10-10T19:31:33.000Z",
    });
  });

  it("does not backfill before the history was ever bootstrapped", async () => {
    previous = null;
    await run();
    expect(send).not.toHaveBeenCalled();
  });

  it("does not backfill when the observation was already recorded", async () => {
    previous = { observedAt: new Date("2026-10-10T12:00:00Z") };
    recorded = false;
    await run();
    expect(send).not.toHaveBeenCalled();
  });

  it("fails an empty list so the run retries", async () => {
    esiList = [];
    await expect(run()).rejects.toThrow(/no insurance prices/);
    expect(record).not.toHaveBeenCalled();
  });
});
