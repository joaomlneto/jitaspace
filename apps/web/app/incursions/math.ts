/**
 * Pure arithmetic behind the incursions page: timers, the longest warp, the
 * influence chart and the high-sec spawn window. Free of React and Prisma so
 * it can be unit-tested directly.
 */

export type IncursionState = "established" | "mobilizing" | "withdrawing";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * The most an incursion can have left from the moment it enters each state:
 * established with up to eight days to go, mobilizing with three (two
 * mobilizing, one withdrawing), withdrawing with one. The constants
 * eve-incursions.de used.
 */
export const STATE_MAX_REMAINING_MS: Record<IncursionState, number> = {
  established: 8 * DAY_MS,
  mobilizing: 3 * DAY_MS,
  withdrawing: 1 * DAY_MS,
};

/** The latest an incursion can end, given when it entered its state. */
export const latestEnd = (state: IncursionState, stateEnteredAt: number) =>
  stateEnteredAt + STATE_MAX_REMAINING_MS[state];

/** "2d 09:31:28", or "9:31:28" under a day; never negative. */
export const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (part: number) => String(part).padStart(2, "0");
  return days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${hours}:${pad(minutes)}:${pad(seconds)}`;
};

/** "2d 4h", "3h 20m", "45m". */
export const formatDuration = (ms: number) => {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
};

export const METERS_PER_AU = 149_597_870_700;

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/**
 * The longest straight line between two of the points, in AU: an
 * approximation of the longest warp in a system, given its warpable objects.
 * Zero for fewer than two points.
 */
export const longestDistanceAu = (points: readonly Point3[]) => {
  let longestSquared = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    if (!a) continue;
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j];
      if (!b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      longestSquared = Math.max(longestSquared, dx * dx + dy * dy + dz * dz);
    }
  }
  return Math.sqrt(longestSquared) / METERS_PER_AU;
};

/** An influence reading: what it changed to, and when. */
export interface InfluenceReading {
  at: number;
  influence: number;
}

/**
 * Samples a step series of influence readings every `stepMs` from
 * `now - windowMs` to `now`, inclusive. A sample before the first reading is
 * null (not tracked yet), rather than zero.
 */
export const sampleInfluence = (
  readings: readonly InfluenceReading[],
  {
    now,
    windowMs = 72 * HOUR_MS,
    stepMs = 15 * 60 * 1000,
  }: { now: number; windowMs?: number; stepMs?: number },
): { at: number; influence: number | null }[] => {
  const sorted = [...readings].sort((a, b) => a.at - b.at);
  const samples: { at: number; influence: number | null }[] = [];
  let next = 0;
  let current: number | null = null;
  for (let at = now - windowMs; at <= now; at += stepMs) {
    while (next < sorted.length && (sorted[next]?.at ?? Infinity) <= at) {
      current = sorted[next]?.influence ?? current;
      next++;
    }
    samples.push({ at, influence: current });
  }
  return samples;
};

/**
 * A new high-sec incursion never spawns within 12 hours of the last one
 * ending, and usually does within 36: the windows eve-incursions.de showed.
 */
export const HIGH_SEC_SPAWN_BLOCKED_MS = 12 * HOUR_MS;
export const HIGH_SEC_SPAWN_EXPECTED_MS = 36 * HOUR_MS;

export type HighSecSpawnOutlook =
  /** A high-sec incursion is up, or there is no ended one to count from. */
  | { kind: "none" }
  | { kind: "blocked"; until: number }
  | { kind: "expected"; until: number }
  | { kind: "overdue"; since: number };

export const highSecSpawnOutlook = ({
  hasActiveHighSec,
  lastHighSecEndedAt,
  now,
}: {
  hasActiveHighSec: boolean;
  lastHighSecEndedAt: number | undefined;
  now: number;
}): HighSecSpawnOutlook => {
  if (hasActiveHighSec || lastHighSecEndedAt === undefined) {
    return { kind: "none" };
  }
  const blockedUntil = lastHighSecEndedAt + HIGH_SEC_SPAWN_BLOCKED_MS;
  if (now < blockedUntil) return { kind: "blocked", until: blockedUntil };
  const expectedBy = lastHighSecEndedAt + HIGH_SEC_SPAWN_EXPECTED_MS;
  if (now < expectedBy) return { kind: "expected", until: expectedBy };
  return { kind: "overdue", since: expectedBy };
};
