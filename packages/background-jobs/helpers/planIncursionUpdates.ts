/**
 * Pure diff between ESI's GET /incursions and the Incursion table, used by the
 * `esi-track-incursions` job. Kept free of ESI/Prisma runtime imports so it can
 * be unit-tested directly.
 */
import type { IncursionsGet } from "@jitaspace/esi-client";

export type IncursionState = "established" | "mobilizing" | "withdrawing";

export type IncursionEventKind =
  | "appeared"
  | "resumed"
  | "state_changed"
  | "influence_changed"
  | "boss_appeared"
  | "boss_disappeared"
  | "staging_system_changed"
  | "system_added"
  | "system_removed"
  | "ended";

/** One incursion as ESI lists it, in our column names. */
export interface IncursionSnapshot {
  constellationId: number;
  factionId: number;
  type: string;
  stagingSolarSystemId: number;
  state: IncursionState;
  influence: number;
  hasBoss: boolean;
  infestedSolarSystemIds: number[];
}

/** An Incursion row (with its infested systems) the plan is diffed against. */
export interface TrackedIncursion extends IncursionSnapshot {
  incursionId: number;
  endedAt: Date | null;
  establishedAt: Date | null;
  mobilizingAt: Date | null;
  withdrawingAt: Date | null;
}

/** An IncursionEvent row, minus the ids and `observedAt` the writer adds. */
export interface IncursionEventDraft {
  kind: IncursionEventKind;
  previousState?: IncursionState;
  state?: IncursionState;
  previousInfluence?: number;
  influence?: number;
  hasBoss?: boolean;
  previousStagingSolarSystemId?: number;
  stagingSolarSystemId?: number;
  solarSystemId?: number;
}

type StateTimestamps = Partial<
  Record<"establishedAt" | "mobilizingAt" | "withdrawingAt", Date>
>;

export interface IncursionUpdatePlan {
  /** Listed by ESI, with no active or recently ended row to match. */
  created: {
    snapshot: IncursionSnapshot;
    stateTimestamps: StateTimestamps;
    events: IncursionEventDraft[];
  }[];
  /**
   * Listed by ESI and matched to a row: every active row ESI still lists, and
   * any recently ended row it lists again (`resumed`). `events` is empty when
   * nothing changed; the row's `lastSeenAt` still moves.
   */
  matched: {
    incursionId: number;
    snapshot: IncursionSnapshot;
    resumed: boolean;
    stateTimestamps: StateTimestamps;
    addedSolarSystemIds: number[];
    removedSolarSystemIds: number[];
    events: IncursionEventDraft[];
  }[];
  /** Active rows ESI no longer lists. */
  ended: { incursionId: number; events: IncursionEventDraft[] }[];
  /** ESI entries dropped because an earlier entry had the same key. */
  duplicates: IncursionSnapshot[];
}

/**
 * How long after being marked ended an incursion that ESI lists again is
 * treated as the same one, rather than a new one. Covers a poll that saw a
 * truncated or failed-over response; CCP does not respawn an incursion in the
 * constellation it just left.
 */
export const RESUME_WINDOW_MS = 60 * 60 * 1000;

const STATE_TIMESTAMP = {
  established: "establishedAt",
  mobilizing: "mobilizingAt",
  withdrawing: "withdrawingAt",
} as const;

/** ESI gives incursions no id: one constellation hosts one at a time. */
const keyOf = (incursion: { constellationId: number; factionId: number }) =>
  `${incursion.constellationId}:${incursion.factionId}`;

/** Flattens one ESI incursion into our column names, keeping every field. */
export const toIncursionSnapshot = (
  incursion: IncursionsGet[number],
): IncursionSnapshot => ({
  constellationId: incursion.constellation_id,
  factionId: incursion.faction_id,
  type: incursion.type,
  stagingSolarSystemId: incursion.staging_solar_system_id,
  state: incursion.state,
  influence: incursion.influence,
  hasBoss: incursion.has_boss,
  infestedSolarSystemIds: [...new Set(incursion.infested_solar_systems)].sort(
    (a, b) => a - b,
  ),
});

/** Every change from `before` to `after`, one event per change. */
export const diffSnapshots = (
  before: IncursionSnapshot,
  after: IncursionSnapshot,
): IncursionEventDraft[] => {
  const events: IncursionEventDraft[] = [];
  if (before.state !== after.state) {
    events.push({
      kind: "state_changed",
      previousState: before.state,
      state: after.state,
    });
  }
  if (before.influence !== after.influence) {
    events.push({
      kind: "influence_changed",
      previousInfluence: before.influence,
      influence: after.influence,
    });
  }
  if (before.hasBoss !== after.hasBoss) {
    events.push({
      kind: after.hasBoss ? "boss_appeared" : "boss_disappeared",
      hasBoss: after.hasBoss,
    });
  }
  if (before.stagingSolarSystemId !== after.stagingSolarSystemId) {
    events.push({
      kind: "staging_system_changed",
      previousStagingSolarSystemId: before.stagingSolarSystemId,
      stagingSolarSystemId: after.stagingSolarSystemId,
    });
  }
  const beforeSystems = new Set(before.infestedSolarSystemIds);
  const afterSystems = new Set(after.infestedSolarSystemIds);
  for (const solarSystemId of after.infestedSolarSystemIds) {
    if (!beforeSystems.has(solarSystemId)) {
      events.push({ kind: "system_added", solarSystemId });
    }
  }
  for (const solarSystemId of before.infestedSolarSystemIds) {
    if (!afterSystems.has(solarSystemId)) {
      events.push({ kind: "system_removed", solarSystemId });
    }
  }
  return events;
};

/**
 * Diffs one poll of ESI against the rows that can still match it: every
 * active incursion, plus those that ended within {@link RESUME_WINDOW_MS}.
 */
export function planIncursionUpdates({
  esiIncursions,
  tracked,
  now,
}: {
  esiIncursions: IncursionSnapshot[];
  tracked: TrackedIncursion[];
  now: Date;
}): IncursionUpdatePlan {
  const plan: IncursionUpdatePlan = {
    created: [],
    matched: [],
    ended: [],
    duplicates: [],
  };

  const active = new Map<string, TrackedIncursion>();
  const recentlyEnded = new Map<string, TrackedIncursion>();
  for (const row of tracked) {
    if (row.endedAt === null) {
      active.set(keyOf(row), row);
    } else if (now.getTime() - row.endedAt.getTime() <= RESUME_WINDOW_MS) {
      // Most recently ended first, should a constellation have two.
      const existing = recentlyEnded.get(keyOf(row));
      if (!existing?.endedAt || existing.endedAt < row.endedAt) {
        recentlyEnded.set(keyOf(row), row);
      }
    }
  }

  const seen = new Set<string>();
  for (const snapshot of esiIncursions) {
    const key = keyOf(snapshot);
    if (seen.has(key)) {
      plan.duplicates.push(snapshot);
      continue;
    }
    seen.add(key);

    const row = active.get(key) ?? recentlyEnded.get(key);
    if (!row) {
      plan.created.push({
        snapshot,
        stateTimestamps: { [STATE_TIMESTAMP[snapshot.state]]: now },
        events: [
          {
            kind: "appeared",
            state: snapshot.state,
            influence: snapshot.influence,
            hasBoss: snapshot.hasBoss,
            stagingSolarSystemId: snapshot.stagingSolarSystemId,
          },
        ],
      });
      continue;
    }

    const resumed = row.endedAt !== null;
    const stateTimestamp = STATE_TIMESTAMP[snapshot.state];
    const beforeSystems = new Set(row.infestedSolarSystemIds);
    const afterSystems = new Set(snapshot.infestedSolarSystemIds);
    plan.matched.push({
      incursionId: row.incursionId,
      snapshot,
      resumed,
      stateTimestamps: row[stateTimestamp] ? {} : { [stateTimestamp]: now },
      addedSolarSystemIds: snapshot.infestedSolarSystemIds.filter(
        (id) => !beforeSystems.has(id),
      ),
      removedSolarSystemIds: row.infestedSolarSystemIds.filter(
        (id) => !afterSystems.has(id),
      ),
      events: [
        ...(resumed ? [{ kind: "resumed" as const }] : []),
        ...diffSnapshots(row, snapshot),
      ],
    });
  }

  for (const [key, row] of active) {
    if (!seen.has(key)) {
      plan.ended.push({
        incursionId: row.incursionId,
        events: [
          {
            kind: "ended",
            state: row.state,
            influence: row.influence,
            hasBoss: row.hasBoss,
          },
        ],
      });
    }
  }

  return plan;
}
