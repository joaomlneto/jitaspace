import { describe, expect, it } from "@jest/globals";

import type { InsurancePricePeriod } from "~/lib/insurance";
import {
  INSURANCE_LEVELS,
  toInsuranceChartPoints,
  toInsurancePricePeriod,
} from "~/lib/insurance";

const period = (
  validFrom: string,
  validUntil: string | null,
  payout: number,
): InsurancePricePeriod => ({
  validFrom,
  validUntil,
  levels: Object.fromEntries(
    INSURANCE_LEVELS.map(({ key }) => [key, { cost: payout / 10, payout }]),
  ) as InsurancePricePeriod["levels"],
});

describe("toInsurancePricePeriod", () => {
  it("maps each level's columns and serialises the bounds", () => {
    const row = {
      validFrom: new Date("2026-10-09T11:50:00Z"),
      validUntil: null,
      basicCost: 1,
      basicPayout: 10,
      standardCost: 2,
      standardPayout: 12,
      bronzeCost: 3,
      bronzePayout: 14,
      silverCost: 4,
      silverPayout: 16,
      goldCost: 5,
      goldPayout: 18,
      platinumCost: null,
      platinumPayout: null,
    };
    expect(toInsurancePricePeriod(row)).toEqual({
      validFrom: "2026-10-09T11:50:00.000Z",
      validUntil: null,
      levels: {
        basic: { cost: 1, payout: 10 },
        standard: { cost: 2, payout: 12 },
        bronze: { cost: 3, payout: 14 },
        silver: { cost: 4, payout: 16 },
        gold: { cost: 5, payout: 18 },
        platinum: { cost: null, payout: null },
      },
    });
  });
});

describe("toInsuranceChartPoints", () => {
  const times = (points: ReturnType<typeof toInsuranceChartPoints>) =>
    points.map((p) => [new Date(p.time).toISOString(), p.payout]);

  it("steps through adjacent periods up to the latest observation", () => {
    const points = toInsuranceChartPoints(
      [
        period("2026-10-01T00:00:00.000Z", "2026-10-02T00:00:00.000Z", 100),
        period("2026-10-02T00:00:00.000Z", null, 110),
      ],
      "2026-10-03T00:00:00.000Z",
      "basic",
    );
    expect(times(points)).toEqual([
      ["2026-10-01T00:00:00.000Z", 100],
      ["2026-10-02T00:00:00.000Z", 110],
      ["2026-10-03T00:00:00.000Z", 110],
    ]);
  });

  it("breaks the line where the type was not listed", () => {
    const points = toInsuranceChartPoints(
      [
        period("2026-10-01T00:00:00.000Z", "2026-10-02T00:00:00.000Z", 100),
        period("2026-10-05T00:00:00.000Z", "2026-10-06T00:00:00.000Z", 120),
      ],
      "2026-10-09T00:00:00.000Z",
      "basic",
    );
    expect(times(points)).toEqual([
      ["2026-10-01T00:00:00.000Z", 100],
      ["2026-10-02T00:00:00.000Z", 100],
      ["2026-10-02T00:00:00.001Z", null],
      ["2026-10-05T00:00:00.000Z", 120],
      ["2026-10-06T00:00:00.000Z", 120],
      ["2026-10-06T00:00:00.001Z", null],
    ]);
  });
});
