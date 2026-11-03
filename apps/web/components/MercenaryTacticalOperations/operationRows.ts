import type {
  MercenaryTacticalOperation,
  MercenaryTacticalOperationState,
} from "@jitaspace/hooks";

/**
 * What the SDE says about one kind of operation. ESI identifies an operation's
 * kind only by its dungeon, which is also the key of
 * mercenaryTacticalOperations.yaml.
 */
export interface MercenaryTacticalOperationKind {
  dungeonId: number;
  name: string;
  description: string;
  anarchyImpact: number;
  developmentImpact: number;
  infomorphBonus: number;
}

/** Whether an operation's details have arrived, are on their way, or failed. */
export type OperationDetailsStatus = "loaded" | "loading" | "failed";

/** One table row: an operation, its details, and what the SDE says of it. */
export interface OperationRow {
  operationId: string;
  mercenaryDenId: number;
  characterIds: number[];
  detailsStatus: OperationDetailsStatus;
  state?: MercenaryTacticalOperationState;
  /** ISO 8601, as ESI sends it. */
  expires?: string;
  dungeonId?: number;
  /** Absent for a dungeon the SDE does not list as an operation. */
  kind?: MercenaryTacticalOperationKind;
  /** The planet whose skyhook the den is attached to, when the den is known. */
  planetId?: number;
  /**
   * The den is not located yet, but a character listing the operation is
   * still loading its dens, so it may well be.
   */
  locationPending?: boolean;
}

/**
 * Every state ESI defines, in the order they are offered as filters: what can
 * still be done first, then what is over.
 */
export const OPERATION_STATES = [
  "Available",
  "Started",
  "Completed",
  "Expired",
  "Removed",
  "Unspecified",
] as const satisfies readonly MercenaryTacticalOperationState[];

export const OPERATION_STATE_LABELS: Record<
  MercenaryTacticalOperationState,
  string
> = {
  Available: "Available",
  Started: "In progress",
  Completed: "Completed",
  Expired: "Expired",
  Removed: "Removed",
  Unspecified: "Unknown",
};

/**
 * ESI's own descriptions, shown where the label alone is ambiguous — "Removed"
 * says nothing about why.
 */
export const OPERATION_STATE_DESCRIPTIONS: Record<
  MercenaryTacticalOperationState,
  string
> = {
  Available: "Not started yet.",
  Started: "Started, not yet completed.",
  Completed: "Completed.",
  Expired: "Expired before it was completed.",
  Removed: "Removed, for example because its Mercenary Den was removed.",
  Unspecified: "ESI did not say which state this operation is in.",
};

export const OPERATION_STATE_COLORS: Record<
  MercenaryTacticalOperationState,
  string
> = {
  Available: "green",
  Started: "blue",
  Completed: "teal",
  Expired: "gray",
  Removed: "red",
  Unspecified: "gray",
};

/** The text an operation goes by, with or without the SDE's name for it. */
export function operationName(row: OperationRow): string {
  if (row.kind) return row.kind.name;
  if (row.dungeonId !== undefined) return `Operation ${row.dungeonId}`;
  return "Unknown operation";
}

function detailsStatus(
  operation: MercenaryTacticalOperation,
  failedOperationIds: ReadonlySet<string>,
): OperationDetailsStatus {
  if (operation.details) return "loaded";
  if (failedOperationIds.has(operation.operationId)) return "failed";
  return "loading";
}

/**
 * Build the table's rows from the hook's operations.
 *
 * `failedOperationIds` tells an operation whose details failed apart from one
 * whose details are still on their way: both arrive without details.
 * `denPlanets` maps a Mercenary Den to the planet it orbits, for the dens whose
 * owners shared their structures; `denPendingCharacterIds` are the characters
 * whose dens are still loading.
 */
export function toOperationRows(
  operations: readonly MercenaryTacticalOperation[],
  kinds: readonly MercenaryTacticalOperationKind[],
  failedOperationIds: ReadonlySet<string>,
  denPlanets: ReadonlyMap<number, number>,
  denPendingCharacterIds: ReadonlySet<number> = new Set(),
): OperationRow[] {
  const kindByDungeon = new Map(kinds.map((kind) => [kind.dungeonId, kind]));
  return operations.map((operation) => {
    const { details } = operation;
    const row: OperationRow = {
      operationId: operation.operationId,
      mercenaryDenId: operation.mercenaryDenId,
      characterIds: operation.characterIds,
      detailsStatus: detailsStatus(operation, failedOperationIds),
    };
    const planetId = denPlanets.get(operation.mercenaryDenId);
    if (planetId !== undefined) row.planetId = planetId;
    else if (
      operation.characterIds.some((id) => denPendingCharacterIds.has(id))
    )
      row.locationPending = true;
    if (details) {
      row.state = details.state;
      row.expires = details.expires;
      row.dungeonId = details.dungeon_type_id;
      const kind = kindByDungeon.get(details.dungeon_type_id);
      if (kind) row.kind = kind;
    }
    return row;
  });
}

/** The filters the page applies before the table sees the rows. */
export interface OperationFilters {
  /** `null` keeps every character. */
  characterIds: readonly number[] | null;
  /** `null` keeps every state. */
  states: readonly MercenaryTacticalOperationState[] | null;
}

/**
 * Keep the rows matching every filter.
 *
 * A row matches the character filter when any character that can see it is
 * selected. A row with no state yet — its details loading or failed — is kept
 * whatever states are selected: hiding it would hide an operation the user
 * may well be looking for, on account of a request that has not answered. With
 * no state selected at all, nothing is kept.
 */
export function filterOperationRows(
  rows: readonly OperationRow[],
  { characterIds, states }: OperationFilters,
): OperationRow[] {
  const wantedCharacters = characterIds ? new Set(characterIds) : null;
  const wantedStates = states ? new Set(states) : null;
  return rows.filter(
    (row) =>
      (!wantedCharacters ||
        row.characterIds.some((id) => wantedCharacters.has(id))) &&
      (!wantedStates ||
        (wantedStates.size > 0 &&
          (row.state === undefined || wantedStates.has(row.state)))),
  );
}

/**
 * The URL value for a multi-select filter after the user changed it: `null`
 * once every option is picked again, so the default view keeps a bare URL and
 * a character who logs in later is included without editing it. An empty
 * array is a real choice — everything deselected — and stays empty.
 */
export function nextSelection<T>(
  selected: readonly T[],
  options: readonly T[],
): T[] | null {
  const everyOption =
    options.length > 0 && options.every((option) => selected.includes(option));
  return everyOption ? null : [...selected];
}

/** How many rows are in each state, for the state filter's counts. */
export function countByState(
  rows: readonly OperationRow[],
): Partial<Record<MercenaryTacticalOperationState, number>> {
  const counts: Partial<Record<MercenaryTacticalOperationState, number>> = {};
  for (const row of rows) {
    if (row.state === undefined) continue;
    counts[row.state] = (counts[row.state] ?? 0) + 1;
  }
  return counts;
}
