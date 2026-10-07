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
    /** ESI's `type` changed: no event kind records it, but the row must. */
    typeChanged: boolean;
  }[];
  /**
   * Active rows ESI no longer lists, and any extra active row for a key that
   * already has one (only the oldest can match).
   */
  ended: { incursionId: number; events: IncursionEventDraft[] }[];
  /** ESI entries dropped because an earlier entry had the same key. */
  duplicates: IncursionSnapshot[];
  /**
   * ESI listed nothing while incursions were active: taken as a failed
   * response, so the plan changes nothing.
   */
  emptyResponseIgnored: boolean;
}

/**
 * How long after being marked ended an incursion that ESI lists again is
 * treated as the same one, rather than a new one. Covers a poll that saw a
 * truncated or failed-over response; CCP does not respawn an incursion in the
 * constellation it just left.
 */
export const RESUME_WINDOW_MS = 60 * 60 * 1000;

/**
 * The longest a gap between polls can be for a newly listed incursion to count
 * as seen from its start. After a longer one (the first poll ever, an outage,
 * a deploy) it may have spawned during the gap.
 */
export const MAX_POLL_GAP_MS = 30 * 60 * 1000;

/** Whether an incursion first listed `now` was listed from its start. */
export const isObservedFromStart = (previousPollAt: Date | null, now: Date) =>
  previousPollAt !== null &&
  now.getTime() - previousPollAt.getTime() <= MAX_POLL_GAP_MS;

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

type Planned<K extends "created" | "matched" | "ended"> =
  IncursionUpdatePlan[K][number];

/**
 * The rows a poll can match, by key: the active ones (the oldest for a key,
 * any other being an extra that must end) and those that ended within
 * {@link RESUME_WINDOW_MS} (the most recently ended for a key).
 */
const indexTracked = (tracked: readonly TrackedIncursion[], now: Date) => {
  const active = new Map<string, TrackedIncursion>();
  const extraActive: TrackedIncursion[] = [];
  const recentlyEnded = new Map<string, TrackedIncursion>();
  for (const row of tracked) {
    const key = keyOf(row);
    if (row.endedAt === null) {
      // One constellation hosts one incursion: keep the oldest row, and end
      // any other, which would otherwise never match nor end.
      const existing = active.get(key);
      const [kept, extra] =
        existing && existing.incursionId < row.incursionId
          ? [existing, row]
          : [row, existing];
      active.set(key, kept);
      if (extra) extraActive.push(extra);
    } else if (now.getTime() - row.endedAt.getTime() <= RESUME_WINDOW_MS) {
      const existing = recentlyEnded.get(key);
      if (!existing?.endedAt || existing.endedAt < row.endedAt) {
        recentlyEnded.set(key, row);
      }
    }
  }
  return { active, extraActive, recentlyEnded };
};

const planCreated = (
  snapshot: IncursionSnapshot,
  now: Date,
): Planned<"created"> => ({
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

const planMatched = (
  row: TrackedIncursion,
  snapshot: IncursionSnapshot,
  now: Date,
): Planned<"matched"> => {
  const resumed = row.endedAt !== null;
  const stateTimestamp = STATE_TIMESTAMP[snapshot.state];
  const changes = diffSnapshots(row, snapshot);
  const systemsOf = (kind: IncursionEventKind) =>
    changes.flatMap((event) =>
      event.kind === kind && event.solarSystemId !== undefined
        ? [event.solarSystemId]
        : [],
    );
  return {
    incursionId: row.incursionId,
    snapshot,
    resumed,
    stateTimestamps: row[stateTimestamp] ? {} : { [stateTimestamp]: now },
    addedSolarSystemIds: systemsOf("system_added"),
    removedSolarSystemIds: systemsOf("system_removed"),
    events: [...(resumed ? [{ kind: "resumed" as const }] : []), ...changes],
    typeChanged: row.type !== snapshot.type,
  };
};

const planEnded = (row: TrackedIncursion): Planned<"ended"> => ({
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
    emptyResponseIgnored: false,
  };
  const { active, extraActive, recentlyEnded } = indexTracked(tracked, now);

  if (esiIncursions.length === 0 && active.size > 0) {
    // Incursions never all end at once: this is a failed response.
    plan.emptyResponseIgnored = true;
    return plan;
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
    if (row) plan.matched.push(planMatched(row, snapshot, now));
    else plan.created.push(planCreated(snapshot, now));
  }

  for (const [key, row] of active) {
    if (!seen.has(key)) plan.ended.push(planEnded(row));
  }
  plan.ended.push(...extraActive.map(planEnded));

  return plan;
}
