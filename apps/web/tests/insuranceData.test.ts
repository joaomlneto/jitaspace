/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as RouteModule from "../app/api/type/[typeId]/insurance/route";
import type * as DataModule from "~/lib/insuranceData";

const mockCacheLife = jest.fn();
jest.mock("next/cache", () => ({
  cacheLife: (...args: unknown[]) => mockCacheLife(...args),
}));

type Fn = ReturnType<typeof jest.fn<(...args: unknown[]) => Promise<unknown>>>;
const fn = (): Fn => jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPrisma = {
  insurancePrice: { findFirst: fn(), findMany: fn() },
  insurancePriceSnapshot: { findFirst: fn() },
};
jest.mock("~/lib/db", () => ({ prisma: mockPrisma }));

const loadData = () => require("~/lib/insuranceData") as typeof DataModule;

const row = (validFrom: string, validUntil: string | null, basic: number) => ({
  typeId: 587,
  validFrom: new Date(validFrom),
  validUntil: validUntil ? new Date(validUntil) : null,
  basicCost: basic / 10,
  basicPayout: basic,
  standardCost: basic / 5,
  standardPayout: basic * 1.2,
  bronzeCost: basic * 0.3,
  bronzePayout: basic * 1.4,
  silverCost: basic * 0.4,
  silverPayout: basic * 1.6,
  goldCost: basic / 2,
  goldPayout: basic * 1.8,
  platinumCost: basic * 0.6,
  platinumPayout: basic * 2,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("readLatestTypeInsurance", () => {
  it("reads the type's newest row, cached for hours", async () => {
    mockPrisma.insurancePrice.findFirst.mockResolvedValue(
      row("2026-10-10T11:50:00Z", null, 1000),
    );
    const latest = await loadData().readLatestTypeInsurance(587);
    expect(mockPrisma.insurancePrice.findFirst).toHaveBeenCalledWith({
      where: { typeId: 587 },
      orderBy: { validFrom: "desc" },
    });
    expect(mockCacheLife).toHaveBeenCalledWith("hours");
    expect(latest).toMatchObject({
      validFrom: "2026-10-10T11:50:00.000Z",
      validUntil: null,
      levels: { basic: { cost: 100, payout: 1000 } },
    });
  });

  it("is null for a type never insured", async () => {
    mockPrisma.insurancePrice.findFirst.mockResolvedValue(null);
    await expect(loadData().readLatestTypeInsurance(34)).resolves.toBeNull();
  });

  it("lets a database failure throw, so nothing wrong is cached", async () => {
    mockPrisma.insurancePrice.findFirst.mockRejectedValue(new Error("down"));
    await expect(loadData().readLatestTypeInsurance(587)).rejects.toThrow(
      "down",
    );
  });
});

describe("readTypeInsuranceHistory", () => {
  it("returns every period oldest first, and the latest observation", async () => {
    mockPrisma.insurancePrice.findMany.mockResolvedValue([
      row("2026-10-09T11:50:00Z", "2026-10-10T11:50:00Z", 900),
      row("2026-10-10T11:50:00Z", null, 1000),
    ]);
    mockPrisma.insurancePriceSnapshot.findFirst.mockResolvedValue({
      observedAt: new Date("2026-10-10T19:31:33Z"),
    });
    const history = await loadData().readTypeInsuranceHistory(587);
    expect(mockPrisma.insurancePrice.findMany).toHaveBeenCalledWith({
      where: { typeId: 587 },
      orderBy: { validFrom: "asc" },
    });
    expect(history.periods.map((p) => p.validFrom)).toEqual([
      "2026-10-09T11:50:00.000Z",
      "2026-10-10T11:50:00.000Z",
    ]);
    expect(history.lastObservedAt).toBe("2026-10-10T19:31:33.000Z");
  });

  it("has no latest observation before the history begins", async () => {
    mockPrisma.insurancePrice.findMany.mockResolvedValue([]);
    mockPrisma.insurancePriceSnapshot.findFirst.mockResolvedValue(null);
    await expect(loadData().readTypeInsuranceHistory(587)).resolves.toEqual({
      periods: [],
      lastObservedAt: null,
    });
  });
});

describe("GET /api/type/[typeId]/insurance", () => {
  const get = (typeId: string) =>
    (
      require("../app/api/type/[typeId]/insurance/route") as typeof RouteModule
    ).GET(new Request(`https://www.jita.space/api/type/${typeId}/insurance`), {
      params: Promise.resolve({ typeId }),
    });

  it("rejects an id that is not the canonical spelling", async () => {
    const res = await get("0587");
    expect(res.status).toBe(400);
    expect(mockPrisma.insurancePrice.findMany).not.toHaveBeenCalled();
  });

  it("serves the history, cached at the CDN", async () => {
    mockPrisma.insurancePrice.findMany.mockResolvedValue([
      row("2026-10-10T11:50:00Z", null, 1000),
    ]);
    mockPrisma.insurancePriceSnapshot.findFirst.mockResolvedValue({
      observedAt: new Date("2026-10-10T19:31:33Z"),
    });
    const res = await get("587");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    const body = (await res.json()) as { periods: unknown[] };
    expect(body.periods).toHaveLength(1);
  });
});
