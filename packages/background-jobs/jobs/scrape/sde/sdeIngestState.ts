import type { SdeRecord } from "@jitaspace/sde-utils";

import { getRedis } from "../../../kv";

/** Redis key holding the SDE build the database was last ingested from. */
const SDE_INGEST_KEY = "sde:ingest";

/**
 * How long a run may be in flight before `watch-sde` assumes it died. Matches
 * `ingest-sde-all`'s `maxDurationSeconds`, so a run that outlives its own cap
 * (or whose process vanished without unwinding) stops suppressing retries.
 */
export const SDE_INGEST_STALE_AFTER_MS = 3600 * 1000;

export interface SdeIngestState {
  buildNumber: number;
  /** Epoch ms when the ingest of `buildNumber` started. */
  startedAt: number;
  /** Epoch ms when it finished; null while in flight — or if that run died. */
  completedAt: number | null;
}

/**
 * Pull the build number out of a parsed `_sde.yaml`, which nests it under an
 * `sde` key. Throws rather than guessing: the build number is the ingest's
 * identity, and recording a wrong one would make `watch-sde` skip a real update.
 */
export function sdeBuildFromMetadata(metadata: SdeRecord): {
  buildNumber: number;
} {
  const sde = metadata.sde as { buildNumber?: unknown } | undefined;
  const buildNumber = sde?.buildNumber;

  if (typeof buildNumber !== "number" || !Number.isFinite(buildNumber)) {
    throw new TypeError("_sde.yaml carries no usable sde.buildNumber");
  }

  return { buildNumber };
}

/** Narrow a parsed Redis value to a usable state, or null if it's unreadable. */
function parseState(raw: string | null): SdeIngestState | null {
  if (raw === null) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  const { buildNumber, startedAt, completedAt } = (value ?? {}) as Record<
    string,
    unknown
  >;
  if (typeof buildNumber !== "number" || typeof startedAt !== "number") {
    return null;
  }

  return {
    buildNumber,
    startedAt,
    completedAt: typeof completedAt === "number" ? completedAt : null,
  };
}

/**
 * The SDE build the database holds, or null if nothing has been ingested — or
 * if the stored value is unreadable, which is treated the same way: re-ingesting
 * is idempotent, so "can't tell" should fall through to a fresh run.
 */
export async function loadedSdeBuild(): Promise<SdeIngestState | null> {
  const redis = await getRedis();
  return parseState(await redis.get(SDE_INGEST_KEY));
}

/** Claim the marker for `buildNumber`, clearing any previous completion. */
export async function recordSdeIngestStarted(build: {
  buildNumber: number;
}): Promise<void> {
  const redis = await getRedis();
  await redis.set(
    SDE_INGEST_KEY,
    JSON.stringify({
      buildNumber: build.buildNumber,
      startedAt: Date.now(),
      completedAt: null,
    } satisfies SdeIngestState),
  );
}

/**
 * Mark the in-flight ingest finished. Scoped to `buildNumber` so a slow run that
 * a newer one has already superseded can't stamp the newer claim as complete.
 */
export async function recordSdeIngestCompleted(
  buildNumber: number,
): Promise<void> {
  const redis = await getRedis();
  const current = parseState(await redis.get(SDE_INGEST_KEY));
  if (current?.buildNumber !== buildNumber) return;

  await redis.set(
    SDE_INGEST_KEY,
    JSON.stringify({
      ...current,
      completedAt: Date.now(),
    } satisfies SdeIngestState),
  );
}

/**
 * Whether `state` already accounts for `buildNumber` — either the ingest
 * finished, or one is still plausibly in flight. A claim left un-completed for
 * longer than {@link SDE_INGEST_STALE_AFTER_MS} is treated as dead so the next
 * poll retries it.
 */
export function coversSdeBuild(
  state: SdeIngestState | null,
  buildNumber: number,
): boolean {
  if (state?.buildNumber !== buildNumber) return false;
  if (state.completedAt !== null) return true;
  return Date.now() - state.startedAt < SDE_INGEST_STALE_AFTER_MS;
}
