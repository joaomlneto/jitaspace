/**
 * Pure logic behind the SolarSystemCostIndex change log: turning one GET
 * /industry/systems response into per-system values, and diffing it against
 * the state the log already holds. Shared by the hourly
 * `esi-sync-industry-cost-indices` job and the EVE Ref bootstrap script, and
 * free of ESI/Prisma runtime imports so it can be unit-tested directly.
 */

/**
 * The activities ESI reports a cost index for, in column order. ESI's enum
 * names more (`duplicating`, `reverse_engineering`, …), but no response since
 * 2017 has carried them; one that does is counted in `unknownActivities`
 * rather than silently stored nowhere.
 */
export const COST_INDEX_ACTIVITIES = [
  "manufacturing",
  "researching_time_efficiency",
  "researching_material_efficiency",
  "copying",
  "invention",
  "reaction",
] as const;

export type CostIndexActivity = (typeof COST_INDEX_ACTIVITIES)[number];

/** The SolarSystemCostIndex value columns, in `COST_INDEX_ACTIVITIES` order. */
export const COST_INDEX_COLUMNS = [
  "manufacturing",
  "researchingTimeEfficiency",
  "researchingMaterialEfficiency",
  "copying",
  "invention",
  "reaction",
] as const;

export type CostIndexColumn = (typeof COST_INDEX_COLUMNS)[number];

/** One system's indices, in `COST_INDEX_ACTIVITIES` order; null if unlisted. */
export type CostIndexValues = readonly (number | null)[];

/** A solar system's indices in one snapshot, keyed by solar system id. */
export type CostIndexState = Map<number, CostIndexValues>;

/** A row of the SolarSystemCostIndex table. */
export type SolarSystemCostIndexRow = {
  solarSystemId: number;
  validFrom: Date;
} & Record<CostIndexColumn, number | null>;

/** The shape of a GET /industry/systems response, ESI's or EVE Ref's copy. */
export type IndustrySystemsResponse = readonly {
  solar_system_id: number;
  cost_indices: readonly { activity: string; cost_index: number }[];
}[];

const ACTIVITY_INDEX = new Map<string, number>(
  COST_INDEX_ACTIVITIES.map((activity, index) => [activity, index]),
);

/** All six indices null: the row that marks a system ESI stopped listing. */
export const UNLISTED: CostIndexValues = COST_INDEX_ACTIVITIES.map(() => null);

export interface ParsedIndustrySystems {
  state: CostIndexState;
  /** Activities outside `COST_INDEX_ACTIVITIES`, with how often each appeared. */
  unknownActivities: Record<string, number>;
  /** Solar systems listed more than once; the last listing wins. */
  duplicateSystemIds: number[];
}

/** Turns a GET /industry/systems response into per-system values. */
export function parseIndustrySystems(
  response: IndustrySystemsResponse,
): ParsedIndustrySystems {
  const state: CostIndexState = new Map();
  const unknownActivities: Record<string, number> = {};
  const duplicateSystemIds: number[] = [];
  for (const system of response) {
    const values: (number | null)[] = [...UNLISTED];
    for (const { activity, cost_index } of system.cost_indices) {
      const index = ACTIVITY_INDEX.get(activity);
      if (index === undefined) {
        unknownActivities[activity] = (unknownActivities[activity] ?? 0) + 1;
      } else {
        values[index] = cost_index;
      }
    }
    if (state.has(system.solar_system_id)) {
      duplicateSystemIds.push(system.solar_system_id);
    }
    state.set(system.solar_system_id, values);
  }
  return { state, unknownActivities, duplicateSystemIds };
}

/**
 * The response if it has the shape of GET /industry/systems, else null. EVE
 * Ref's archive holds the odd error page saved in place of a response (a 502
 * on 2019-01-06), which must not be read as every system going unlisted.
 */
export function asIndustrySystemsResponse(
  value: unknown,
): IndustrySystemsResponse | null {
  if (!Array.isArray(value)) return null;
  const valid = value.every(
    (system: unknown) =>
      typeof system === "object" &&
      system !== null &&
      typeof (system as { solar_system_id?: unknown }).solar_system_id ===
        "number" &&
      Array.isArray((system as { cost_indices?: unknown }).cost_indices),
  );
  return valid ? (value as IndustrySystemsResponse) : null;
}

/**
 * A response listing far fewer systems than the state it would be diffed
 * against is taken as a truncated or failed one, and skipped: replaying it
 * would mark thousands of systems unlisted and relist them an hour later.
 * ESI has listed 5,431 to 5,485 systems since 2017.
 */
export const isPartialSnapshot = (
  previous: CostIndexState,
  current: CostIndexState,
) => current.size < previous.size * 0.9;

const sameValues = (a: CostIndexValues, b: CostIndexValues) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const isUnlisted = (values: CostIndexValues) =>
  values.every((value) => value === null);

export const toCostIndexRow = (
  solarSystemId: number,
  validFrom: Date,
  values: CostIndexValues,
): SolarSystemCostIndexRow => {
  const row = { solarSystemId, validFrom } as SolarSystemCostIndexRow;
  COST_INDEX_COLUMNS.forEach((column, index) => {
    row[column] = values[index] ?? null;
  });
  return row;
};

export const fromCostIndexRow = (
  row: Record<CostIndexColumn, number | null>,
): CostIndexValues => COST_INDEX_COLUMNS.map((column) => row[column]);

/**
 * The rows a snapshot adds to the change log: one for each system whose
 * indices differ from `previous` (or that is new), and an all-null row for each
 * system `previous` listed that `current` does not. Values compare exactly, as
 * stored.
 */
export function diffCostIndexStates(
  previous: CostIndexState,
  current: CostIndexState,
  validFrom: Date,
): SolarSystemCostIndexRow[] {
  const rows: SolarSystemCostIndexRow[] = [];
  for (const [solarSystemId, values] of current) {
    const before = previous.get(solarSystemId);
    if (before === undefined ? isUnlisted(values) : sameValues(before, values))
      continue;
    rows.push(toCostIndexRow(solarSystemId, validFrom, values));
  }
  for (const [solarSystemId, values] of previous) {
    if (!current.has(solarSystemId) && !isUnlisted(values)) {
      rows.push(toCostIndexRow(solarSystemId, validFrom, UNLISTED));
    }
  }
  return rows;
}

/**
 * The state after applying `rows` to `previous`. Systems whose latest row is
 * all null are dropped, so the result is what the next diff compares against.
 */
export function applyCostIndexRows(
  previous: CostIndexState,
  rows: readonly SolarSystemCostIndexRow[],
): CostIndexState {
  const next = new Map(previous);
  for (const row of rows) {
    const values = fromCostIndexRow(row);
    if (isUnlisted(values)) next.delete(row.solarSystemId);
    else next.set(row.solarSystemId, values);
  }
  return next;
}

/**
 * The time in an EVE Ref industry-systems file name, as UTC: the daily
 * archive's `industry-systems-2026-10-09_00-42-05.json.bz2`, or the yearly
 * archives' `systemcost_2019-01-07T08:15:03.json`. Null for any other name.
 */
export function parseEveRefSnapshotTime(fileName: string): Date | null {
  const match =
    /(\d{4})-(\d{2})-(\d{2})[_T](\d{2})[-:](\d{2})[-:](\d{2})\.json(?:\.bz2)?$/.exec(
      fileName,
    );
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const time = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, 0),
  );
  return Number.isNaN(time.getTime()) ? null : time;
}
