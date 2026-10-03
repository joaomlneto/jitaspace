import { cacheLife } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { buildsDb } from "@jitaspace/db-builds";

import type { BuildServer } from "~/lib/history";
import { buildDiffsUrl } from "~/lib/history-diff";

/**
 * What `GET /api/history` reports: the servers the build history tracks, the
 * build each one is running now, and the newest build recorded for each.
 *
 * A build's `server` is whichever server's build pointer the upstream monitor
 * saw it on *first*, and it is never relabelled: a build tested on
 * Singularity before it reaches Tranquility stays `singularity`. So the
 * newest `tranquility` build in the database can trail what Tranquility runs.
 * That is why the live pointer is reported next to it, with the label the
 * live build was recorded under.
 */

export type TrackedServer = Exclude<BuildServer, null>;

/** The servers the upstream monitor polls (the history DB's `Server` enum). */
export const TRACKED_SERVERS: readonly TrackedServer[] = [
  "tranquility",
  "singularity",
];

/** CCP's build-pointer document for each server. */
const POINTER_URL: Record<TrackedServer, string> = {
  tranquility: "https://binaries.eveonline.com/eveclient_TQ.json",
  singularity: "https://binaries.eveonline.com/eveclient_SISI.json",
};

const POINTER_TIMEOUT_MS = 5_000;

export interface RecordedBuild {
  build: number;
  /** Release date (YYYY-MM-DD); null when unknown. */
  date: string | null;
  /** When its diff was stored, i.e. when it entered the database (ISO 8601). */
  recordedAt: string | null;
  /** Its diff listing, `/api/history/diff/{build}`. */
  url: string;
}

export interface ServerMeta {
  server: TrackedServer;
  /**
   * The build CCP's pointer names right now; null when the pointer could not
   * be read. `recorded` says whether the database has it yet, and
   * `recordedAs` the server it was labelled with (null if not recorded).
   */
  live: {
    build: number;
    recorded: boolean;
    recordedAs: BuildServer;
  } | null;
  /** The newest build labelled with this server; null when there is none. */
  latest: RecordedBuild | null;
  /** Number of builds labelled with this server. */
  buildCount: number;
}

export interface HistoryMetaResponse {
  servers: ServerMeta[];
  /** URL templates of the build-diff endpoints. */
  endpoints: { build: string; diff: string };
}

/** The build CCP's pointer names for `server`; throws on any failure. */
async function readLivePointer(server: TrackedServer): Promise<number> {
  "use cache";
  // The monitor polls every 15 minutes; a minute's staleness costs nothing.
  cacheLife("minutes");

  const res = await fetch(POINTER_URL[server], {
    signal: AbortSignal.timeout(POINTER_TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(`${POINTER_URL[server]} answered HTTP ${res.status}`);
  const build = Number(((await res.json()) as { build?: unknown }).build);
  if (!Number.isSafeInteger(build) || build <= 0)
    throw new Error(`${POINTER_URL[server]} named no build`);
  return build;
}

/**
 * The live pointer, or `null` when CCP's CDN is down or slow: it is extra
 * context next to what the database holds, so it degrades rather than failing
 * the response. Caught here, outside the cached read, so a failure is never
 * stored; reported, since a lasting one would otherwise look like a quiet day.
 */
async function readLivePointerOrNull(
  server: TrackedServer,
): Promise<number | null> {
  try {
    return await readLivePointer(server);
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "history-meta" } });
    return null;
  }
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const ymd = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : null;

/**
 * Per-server build counts and newest builds, plus how the given live builds
 * were recorded. Keyed on the live build numbers, which come from CCP and not
 * from the request, so the keys stay few. Throws on a database failure.
 */
async function getCachedServerMeta(liveBuilds: readonly number[]): Promise<{
  counts: Partial<Record<TrackedServer, number>>;
  latest: Partial<Record<TrackedServer, RecordedBuild>>;
  recordedAs: Record<number, BuildServer>;
}> {
  "use cache";
  cacheLife("minutes");

  const grouped = await buildsDb.build.groupBy({
    by: ["server"],
    where: { server: { in: [...TRACKED_SERVERS] } },
    _count: true,
    _max: { buildNumber: true },
  });
  const latestByServer = new Map<TrackedServer, number>();
  const counts: Partial<Record<TrackedServer, number>> = {};
  for (const g of grouped) {
    if (g.server === null) continue;
    counts[g.server] = g._count;
    if (g._max.buildNumber !== null)
      latestByServer.set(g.server, g._max.buildNumber);
  }

  const wanted = [...new Set([...latestByServer.values(), ...liveBuilds])];
  const [builds, diffs] = await Promise.all([
    buildsDb.build.findMany({
      where: { buildNumber: { in: wanted } },
      select: { buildNumber: true, releasedAt: true, server: true },
    }),
    buildsDb.buildDiff.findMany({
      where: { toBuild: { in: wanted } },
      select: { toBuild: true, createdAt: true },
    }),
  ]);
  const buildOf = new Map(builds.map((b) => [b.buildNumber, b]));
  const recordedAtOf = new Map(diffs.map((d) => [d.toBuild, d.createdAt]));

  const latest: Partial<Record<TrackedServer, RecordedBuild>> = {};
  for (const [server, build] of latestByServer)
    latest[server] = {
      build,
      date: ymd(buildOf.get(build)?.releasedAt),
      recordedAt: iso(recordedAtOf.get(build)),
      url: buildDiffsUrl(build),
    };

  const recordedAs: Record<number, BuildServer> = {};
  for (const build of liveBuilds) {
    const row = buildOf.get(build);
    if (row) recordedAs[build] = row.server;
  }
  return { counts, latest, recordedAs };
}

export async function readHistoryMeta(): Promise<HistoryMetaResponse> {
  const live = await Promise.all(TRACKED_SERVERS.map(readLivePointerOrNull));
  const liveBuilds = live
    .filter((b): b is number => b !== null)
    .sort((a, b) => a - b);
  const { counts, latest, recordedAs } = await getCachedServerMeta(liveBuilds);

  return {
    servers: TRACKED_SERVERS.map((server, i) => {
      const build = live[i] ?? null;
      return {
        server,
        live:
          build === null
            ? null
            : {
                build,
                recorded: build in recordedAs,
                recordedAs: recordedAs[build] ?? null,
              },
        latest: latest[server] ?? null,
        buildCount: counts[server] ?? 0,
      };
    }),
    endpoints: {
      build: "/api/history/diff/{build}",
      diff: "/api/history/diff/{from}/{to}",
    },
  };
}
