/**
 * Ship insurance prices, as the `esi-track-insurance-prices` job and the EVE
 * Ref backfill record them (InsurancePrice, InsurancePriceSnapshot). Types and
 * level metadata are shared by the server reads and the client.
 */

/** ESI's insurance levels, cheapest first, with their InsurancePrice columns. */
export const INSURANCE_LEVELS = [
  { key: "basic", name: "Basic" },
  { key: "standard", name: "Standard" },
  { key: "bronze", name: "Bronze" },
  { key: "silver", name: "Silver" },
  { key: "gold", name: "Gold" },
  { key: "platinum", name: "Platinum" },
] as const;

export type InsuranceLevelKey = (typeof INSURANCE_LEVELS)[number]["key"];

/** The levels' keys, cheapest first. */
export const INSURANCE_LEVEL_KEYS: readonly InsuranceLevelKey[] =
  INSURANCE_LEVELS.map(({ key }) => key);

/** One level's premium (`cost`) and what a loss pays out; null if unlisted. */
export interface InsuranceLevelPrice {
  cost: number | null;
  payout: number | null;
}

/** A type's prices over one stretch of time. Times are ISO strings. */
export interface InsurancePricePeriod {
  /** The first observation listing these prices. */
  validFrom: string;
  /** The first observation that no longer did; null while current. */
  validUntil: string | null;
  levels: Record<InsuranceLevelKey, InsuranceLevelPrice>;
}

export interface TypeInsuranceHistory {
  /** Oldest first. */
  periods: InsurancePricePeriod[];
  /** The latest observation of the price list, for any type. */
  lastObservedAt: string | null;
}

type InsurancePriceColumns = {
  [K in InsuranceLevelKey as `${K}Cost` | `${K}Payout`]: number | null;
};

/** An InsurancePrice row as the client sees it. */
export function toInsurancePricePeriod(
  row: InsurancePriceColumns & { validFrom: Date; validUntil: Date | null },
): InsurancePricePeriod {
  return {
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil?.toISOString() ?? null,
    levels: Object.fromEntries(
      INSURANCE_LEVELS.map(({ key }) => [
        key,
        { cost: row[`${key}Cost`], payout: row[`${key}Payout`] },
      ]),
    ) as Record<InsuranceLevelKey, InsuranceLevelPrice>,
  };
}

export interface InsuranceChartPoint {
  time: number;
  /** Null breaks the line: the type was not listed then. */
  payout: number | null;
  period: InsurancePricePeriod | null;
}

/**
 * One level's payout as a step line: a point where each period starts, held
 * flat until the next (`stepAfter`), plus one where the last ends, so the line
 * reaches the latest observation. A stretch the type was not listed breaks the
 * line.
 */
export function toInsuranceChartPoints(
  periods: readonly InsurancePricePeriod[],
  lastObservedAt: string | null,
  level: InsuranceLevelKey,
): InsuranceChartPoint[] {
  const points: InsuranceChartPoint[] = [];
  periods.forEach((period, index) => {
    const payout = period.levels[level].payout;
    points.push({ time: Date.parse(period.validFrom), payout, period });
    const next = periods[index + 1];
    const end = period.validUntil ?? lastObservedAt;
    if (end === null || next?.validFrom === end) return;
    points.push({ time: Date.parse(end), payout, period });
    if (period.validUntil !== null) {
      points.push({ time: Date.parse(end) + 1, payout: null, period: null });
    }
  });
  return points;
}
