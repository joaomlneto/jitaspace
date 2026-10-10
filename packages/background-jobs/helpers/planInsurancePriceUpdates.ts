/**
 * Pure diff between one observation of ESI's insurance price list and the
 * InsurancePrice table, used by the `esi-track-insurance-prices` job and the
 * EVE Ref backfill. Kept free of ESI/Prisma runtime imports so it can be
 * unit-tested directly.
 *
 * An observation may land between two already recorded (the backfill fills a
 * gap after the job has polled past it), so it can split a row in two or move
 * a later row's start earlier, not only close the current row.
 */
import type { InsurancePricesGet } from "@jitaspace/esi-client";

/** ESI's level names (in English) and the columns each is stored in. */
export const INSURANCE_LEVELS = {
  Basic: { cost: "basicCost", payout: "basicPayout" },
  Standard: { cost: "standardCost", payout: "standardPayout" },
  Bronze: { cost: "bronzeCost", payout: "bronzePayout" },
  Silver: { cost: "silverCost", payout: "silverPayout" },
  Gold: { cost: "goldCost", payout: "goldPayout" },
  Platinum: { cost: "platinumCost", payout: "platinumPayout" },
} as const;

type LevelColumns = (typeof INSURANCE_LEVELS)[keyof typeof INSURANCE_LEVELS];
type InsurancePriceColumn = LevelColumns["cost"] | LevelColumns["payout"];

/** One type's prices, in our column names; a level ESI left out is null. */
export type InsurancePriceValues = Record<InsurancePriceColumn, number | null>;

const PRICE_COLUMNS = Object.values(INSURANCE_LEVELS).flatMap(
  ({ cost, payout }) => [cost, payout],
);

/** An InsurancePrice row, as far as the plan needs it. */
export type InsurancePriceRow = InsurancePriceValues & {
  typeId: number;
  validFrom: Date;
  validUntil: Date | null;
};

/**
 * ESI's list as a map from type id to prices. Throws on anything it cannot
 * store verbatim (a level name it does not know, a type or level listed
 * twice), so a change in ESI's shape fails the run instead of being dropped.
 */
export function parseInsurancePriceList(
  list: InsurancePricesGet,
): Map<number, InsurancePriceValues> {
  const prices = new Map<number, InsurancePriceValues>();
  for (const { type_id: typeId, levels } of list) {
    if (prices.has(typeId)) {
      throw new Error(`Insurance price list lists type ${typeId} twice`);
    }
    const values = Object.fromEntries(
      PRICE_COLUMNS.map((column) => [column, null]),
    ) as InsurancePriceValues;
    const seen = new Set<string>();
    for (const { name, cost, payout } of levels) {
      if (!Object.hasOwn(INSURANCE_LEVELS, name)) {
        throw new Error(
          `Unknown insurance level "${name}" for type ${typeId} (is the list in English?)`,
        );
      }
      if (seen.has(name)) {
        throw new Error(`Insurance level "${name}" listed twice for ${typeId}`);
      }
      seen.add(name);
      const columns = INSURANCE_LEVELS[name as keyof typeof INSURANCE_LEVELS];
      values[columns.cost] = cost;
      values[columns.payout] = payout;
    }
    prices.set(typeId, values);
  }
  return prices;
}

/**
 * When ESI says the list was last refreshed. It caches the list for an hour,
 * so this is the moment the observation stands for, and polling twice in one
 * cache window yields the same observation. Falls back to now without one.
 */
export function observedAtFromLastModified(
  lastModified: unknown,
  now: Date,
): Date {
  if (typeof lastModified !== "string") return now;
  const parsed = new Date(lastModified);
  return Number.isNaN(parsed.getTime()) || parsed > now ? now : parsed;
}

export const pricesAreEqual = (
  a: InsurancePriceValues,
  b: InsurancePriceValues,
): boolean => PRICE_COLUMNS.every((column) => a[column] === b[column]);

const pickValues = (row: InsurancePriceValues): InsurancePriceValues =>
  Object.fromEntries(
    PRICE_COLUMNS.map((column) => [column, row[column]]),
  ) as InsurancePriceValues;

export interface InsurancePricePlanInput {
  /** When the observation was made. No observation exists at this time yet. */
  observedAt: Date;
  /** What it listed. */
  prices: ReadonlyMap<number, InsurancePriceValues>;
  /** The rows current at `observedAt`: `validFrom <= observedAt < validUntil`. */
  containing: readonly InsurancePriceRow[];
  /** The first observation after `observedAt`, if any. */
  nextObservedAt: Date | null;
  /** The rows starting at `nextObservedAt` (empty when it is null). */
  startingAtNext: readonly InsurancePriceRow[];
}

export interface InsurancePricePlan {
  /** New rows. */
  create: InsurancePriceRow[];
  /** Types whose row current at `observedAt` now ends there. */
  closeTypeIds: number[];
  /**
   * Types whose row starting at `nextObservedAt` is replaced by one starting
   * at `observedAt` (in `create`), because the prices did not change there.
   */
  deleteAtNextTypeIds: number[];
  /** Types whose prices differ from those current before `observedAt`. */
  changedTypeIds: number[];
}

/**
 * What one observation changes. Per type, with P the row current at
 * `observedAt` and N the next observation:
 *
 * - Same prices as P (or unlisted in both): nothing.
 * - Otherwise P ends at `observedAt`; if it ran past N, the stretch from N on
 *   keeps P's prices as a row of its own (N still observed them).
 * - If listed, a row with the new prices starts at `observedAt` and runs until
 *   N, or on through N's row when that has the same prices (merged).
 *
 * With no observation after it, this is the plain "append the latest poll"
 * case: changed rows end, new ones start, open-ended.
 */
export function planInsurancePriceUpdates({
  observedAt,
  prices,
  containing,
  nextObservedAt,
  startingAtNext,
}: InsurancePricePlanInput): InsurancePricePlan {
  const containingByType = indexByType(containing, "containing");
  const nextByType = indexByType(startingAtNext, "startingAtNext");
  const plan: InsurancePricePlan = {
    create: [],
    closeTypeIds: [],
    deleteAtNextTypeIds: [],
    changedTypeIds: [],
  };

  const typeIds = new Set([...containingByType.keys(), ...prices.keys()]);
  for (const typeId of [...typeIds].sort((a, b) => a - b)) {
    const current = containingByType.get(typeId);
    const observed = prices.get(typeId);
    if (current && observed && pricesAreEqual(current, observed)) continue;
    plan.changedTypeIds.push(typeId);
    if (current) plan.closeTypeIds.push(typeId);

    // What N saw: the tail of P when P runs past it, or else N's own row.
    const tail = current && tailFromNext(current, nextObservedAt);
    const atNext = tail ?? nextByType.get(typeId);

    if (!observed) {
      if (tail) plan.create.push(tail);
    } else if (atNext && pricesAreEqual(atNext, observed)) {
      // N saw the same prices: one row from here through N's.
      plan.create.push(row(typeId, observedAt, atNext.validUntil, observed));
      if (!tail) plan.deleteAtNextTypeIds.push(typeId);
    } else {
      plan.create.push(row(typeId, observedAt, nextObservedAt, observed));
      if (tail) plan.create.push(tail);
    }
  }

  return plan;
}

const row = (
  typeId: number,
  validFrom: Date,
  validUntil: Date | null,
  values: InsurancePriceValues,
): InsurancePriceRow => ({
  typeId,
  validFrom,
  validUntil,
  ...pickValues(values),
});

/**
 * The part of `current` from the next observation on, as a row of its own,
 * when `current` runs past that observation (which still saw its prices).
 */
function tailFromNext(
  current: InsurancePriceRow,
  nextObservedAt: Date | null,
): InsurancePriceRow | undefined {
  const runsPastNext =
    nextObservedAt !== null &&
    (current.validUntil === null || current.validUntil > nextObservedAt);
  return runsPastNext
    ? row(current.typeId, nextObservedAt, current.validUntil, current)
    : undefined;
}

function indexByType(
  rows: readonly InsurancePriceRow[],
  what: string,
): Map<number, InsurancePriceRow> {
  const byType = new Map<number, InsurancePriceRow>();
  for (const row of rows) {
    if (byType.has(row.typeId)) {
      // Rows of one type never overlap, so this is a broken table.
      throw new Error(`Two ${what} insurance price rows for ${row.typeId}`);
    }
    byType.set(row.typeId, row);
  }
  return byType;
}
