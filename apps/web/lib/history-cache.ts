import { cacheLife } from "next/cache";

import { historyDb } from "@jitaspace/db-history";

import type {
  BuildRangeChanges,
  EntityTimeline,
  HistoryIndex,
} from "~/lib/history";
import {
  HISTORY_MIN_RELEASE_DATE,
  isBuildInHistoryScope,
  netOp,
} from "~/lib/history";

/**
 * Day-cached reads of the change-history data.
 *
 * The underlying queries hit the standalone history database
 * (@jitaspace/db-history) and the data only moves when a new EVE client build is
 * processed (rare, via the background jobs), so each result is cached for a day
 * (`cacheLife("days")`). The matching `"use server"` actions in
 * `history-actions.ts` delegate here, so every entry point (the `/history`
 * server component and the React Query client paths) shares one cache entry and
 * the DB is queried at most once per revalidation window per cache key.
 *
 * Kept in its own module (not the `"use server"` `history-actions.ts`) because a
 * function cannot be both a `"use cache"` entry and a `"use server"` action.
 */

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Cached {@link HistoryIndex} (SDE collections only; localization strings live elsewhere). */
export async function getCachedHistoryIndex(): Promise<HistoryIndex> {
  "use cache";
  cacheLife("days");

  const notStr = { name: { not: { startsWith: "strings:" } } };
  const [builds, collections, grouped, entityGroups, diffs] = await Promise.all(
    [
      historyDb.build.findMany({
        orderBy: { buildNumber: "asc" },
        select: { buildNumber: true, releasedAt: true, server: true },
      }),
      historyDb.collection.findMany({
        where: notStr,
        select: { id: true, name: true },
      }),
      historyDb.change.groupBy({
        by: ["diffId", "collectionId"],
        where: { collection: notStr },
        _count: true,
      }),
      // Count entities per kind in the DB rather than fetching every changed
      // entity's id: the client only needs the population size, and shipping the
      // full id lists bloated the index payload (re-transferred on every refresh,
      // since the page fetches it through a server action).
      historyDb.entity.groupBy({
        by: ["kind"],
        where: { kind: { not: { startsWith: "string:" } } },
        _count: true,
      }),
      historyDb.buildDiff.findMany({ select: { id: true, toBuild: true } }),
    ],
  );

  const colName = new Map(collections.map((c) => [c.id, c.name]));
  const toBuildOf = new Map(diffs.map((d) => [d.id, d.toBuild]));
  const perBuild = new Map<number, Record<string, number>>();
  for (const g of grouped) {
    const name = colName.get(g.collectionId);
    const toBuild = toBuildOf.get(g.diffId);
    if (!name || toBuild === undefined) continue;
    const m = perBuild.get(toBuild) ?? {};
    // Multiple diffs can target the same build (e.g. connecting an SDE backfill
    // onto the CDN era), so accumulate across them rather than overwrite — same
    // diffId→toBuild collapse as getResourceIndex.
    m[name] = (m[name] ?? 0) + g._count;
    perBuild.set(toBuild, m);
  }

  // Entity populations (per kind) are intentionally NOT narrowed to the build
  // scope floor — these drive the index's "entities with recorded changes"
  // counts and the Kind selector, which describe the whole tracked dataset, not
  // just the windowed build list. (An entity whose only change is the excluded
  // baseline build still counts here, but its timeline renders empty.)
  const entityCountsByType: Record<string, number> = {};
  for (const g of entityGroups) entityCountsByType[g.kind] = g._count;

  // Drop builds out of scope — test-server (Singularity) builds and the pre-2012
  // baseline (build 80313). This filters both the index list and the timeline
  // chart (which reads the same `builds` array); a dropped build's change counts
  // sit in `perBuild` under its `toBuild` but are never read, since only the
  // surviving builds are mapped below.
  const buildsOut = builds
    .filter((b) => isBuildInHistoryScope(b.releasedAt, b.server))
    .map((b) => {
      const byCollection = perBuild.get(b.buildNumber) ?? {};
      const changeCount = Object.values(byCollection).reduce(
        (a, c) => a + c,
        0,
      );
      return {
        build: b.buildNumber,
        date: ymd(b.releasedAt),
        changeCount,
        ...(changeCount ? { byCollection } : {}),
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    collections: collections.map((c) => c.name),
    entityTypes: Object.keys(entityCountsByType),
    builds: buildsOut,
    entityCountsByType,
  };
}

/**
 * Cached per-entity {@link EntityTimeline} for any kind ("type", "skin", …).
 *
 * Cached per `(entityType, entityId)` — `"use cache"` keys on the arguments — so
 * each entity's timeline is read from the history DB at most once per day,
 * shared across the standalone history pages and the embedded History tabs.
 * "Not found" resolves to `null` so callers can render an empty state.
 */
export async function getCachedEntityTimeline(
  entityType: string,
  entityId: number,
): Promise<EntityTimeline | null> {
  "use cache";
  cacheLife("days");

  if (!Number.isInteger(entityId)) return null;

  const rows = await historyDb.change.findMany({
    where: { entity: { kind: entityType, eveId: entityId } },
    select: {
      op: true,
      data: true,
      diffId: true,
      collection: { select: { name: true } },
    },
    orderBy: { diff: { toBuild: "asc" } },
  });
  if (rows.length === 0) return null;

  // Resolve the build axis via lookups instead of the change→diff→to→Build
  // relation chain. Each hop can dangle while the shared eve-builds DB is
  // mid-migration (a missing BuildDiff, or a BuildDiff whose toBuild has no
  // Build row), and traversing a null relation crashed the timeline. A change
  // whose diff is gone can't be placed on the axis (skip it); a missing Build
  // row yields a null date.
  const [diffs, builds, resfileDiffs] = await Promise.all([
    historyDb.buildDiff.findMany({
      select: { id: true, fromBuild: true, toBuild: true },
    }),
    historyDb.build.findMany({
      select: { buildNumber: true, releasedAt: true, server: true },
    }),
    // Which diffs carry resource-file changes → they came from the resource
    // server (CDN); diffs with none are SDE-backfill diffs (the SDE produces no
    // res files). This presence/absence is the only provenance signal — there is
    // no explicit source field.
    historyDb.fileChange.groupBy({ by: ["diffId"], _count: true }),
  ]);
  const toBuildOf = new Map(diffs.map((d) => [d.id, d.toBuild]));
  const fromBuildOf = new Map(diffs.map((d) => [d.id, d.fromBuild]));
  const releasedAtOf = new Map(
    builds.map((b) => [b.buildNumber, b.releasedAt]),
  );
  const serverOf = new Map(builds.map((b) => [b.buildNumber, b.server]));
  const resfileDiffIds = new Set(resfileDiffs.map((g) => g.diffId));

  const events = rows.flatMap((r) => {
    const build = toBuildOf.get(r.diffId);
    if (build === undefined) return [];
    const releasedAt = releasedAtOf.get(build) ?? null;
    const server = serverOf.get(build) ?? null;
    // Drop events on out-of-scope builds — test-server (Singularity) builds and
    // pre-scope-floor builds (build 80313, the pre-2012 baseline) — so timelines
    // show only real Tranquility/SDE releases, consistent with the index.
    if (!isBuildInHistoryScope(releasedAt, server)) return [];
    return [
      {
        build,
        date: ymd(releasedAt),
        collection: r.collection.name,
        fromBuild: fromBuildOf.get(r.diffId) ?? null,
        server,
        provenance: resfileDiffIds.has(r.diffId)
          ? ("resource-server" as const)
          : ("sde" as const),
        v: 1 as const,
        kind: r.op,
        ...(r.op === "modified" ? { fields: r.data } : { values: r.data }),
      },
    ];
  }) as EntityTimeline["events"];
  // Every recorded change fell on an out-of-scope build ⇒ treat as "not found"
  // so the page renders its empty state (matching the no-rows case above).
  if (events.length === 0) return null;

  return { entityType, entityId, events };
}

/**
 * Cached net {@link BuildRangeChanges} between two builds.
 *
 * A fixed `(from, to)` pair is immutable — the diffs between two past builds
 * never change (new builds only add future diffs) — so this is cached with the
 * longest profile (`cacheLife("max")`, effectively forever), keyed on the pair.
 *
 * The heavy lifting is done in the DB. A wide range (e.g. builds years apart)
 * spans hundreds of thousands of Change rows; fetching them all and folding in
 * JS timed out. Instead a single grouped query returns just one row per changed
 * `(entity, collection)` — the op at the earliest and latest in-scope build in
 * the range — which {@link netOp} folds to a net op. Out-of-scope intermediate
 * builds (Singularity / the pre-2012 baseline) are filtered in SQL, mirroring
 * {@link isBuildInHistoryScope}; `::text` sidesteps enum-literal handling and the
 * id is coerced because CockroachDB returns INT8 as a string.
 *
 * Returns `null` for invalid input (a missing or out-of-scope endpoint, or
 * `from >= to`); an empty `changes` list means nothing changed between them.
 */
export async function getCachedBuildRangeChanges(
  from: number,
  to: number,
): Promise<BuildRangeChanges | null> {
  "use cache";
  cacheLife("max");

  if (!Number.isInteger(from) || !Number.isInteger(to) || from >= to)
    return null;

  const [fromB, toB] = await Promise.all([
    historyDb.build.findUnique({
      where: { buildNumber: from },
      select: { releasedAt: true, server: true },
    }),
    historyDb.build.findUnique({
      where: { buildNumber: to },
      select: { releasedAt: true, server: true },
    }),
  ]);
  if (!fromB || !isBuildInHistoryScope(fromB.releasedAt, fromB.server))
    return null;
  if (!toB || !isBuildInHistoryScope(toB.releasedAt, toB.server)) return null;

  const floor = new Date(`${HISTORY_MIN_RELEASE_DATE}T00:00:00.000Z`);
  const rows = await historyDb.$queryRaw<
    {
      entityType: string;
      entityId: number | bigint | string;
      collection: string;
      firstOp: string;
      lastOp: string;
    }[]
  >`
    SELECT
      e."kind"   AS "entityType",
      e."eveId"  AS "entityId",
      col."name" AS "collection",
      (array_agg(c."op"::text ORDER BY d."toBuild" ASC))[1]  AS "firstOp",
      (array_agg(c."op"::text ORDER BY d."toBuild" DESC))[1] AS "lastOp"
    FROM "Change" c
    JOIN "BuildDiff" d ON d."id" = c."diffId"
    JOIN "Build" b ON b."buildNumber" = d."toBuild"
    JOIN "Entity" e ON e."id" = c."entityId"
    JOIN "Collection" col ON col."id" = c."collectionId"
    WHERE d."toBuild" > ${from}
      AND d."toBuild" <= ${to}
      AND col."name" NOT LIKE 'strings:%'
      AND b."server"::text IS DISTINCT FROM 'singularity'
      AND (b."releasedAt" IS NULL OR b."releasedAt" >= ${floor})
    GROUP BY e."kind", e."eveId", col."name"
  `;

  const changes = rows.flatMap((r) => {
    const kind = netOp([
      r.firstOp as "added" | "modified" | "removed",
      r.lastOp as "added" | "modified" | "removed",
    ]);
    if (!kind) return []; // transient (added and removed within the range)
    return [
      {
        entityId: Number(r.entityId),
        entityType: r.entityType,
        collection: r.collection,
        v: 1 as const,
        kind,
        ...(kind === "modified" ? { fields: {} } : {}),
      },
    ];
  }) as BuildRangeChanges["changes"];

  return {
    from,
    to,
    fromDate: ymd(fromB.releasedAt),
    toDate: ymd(toB.releasedAt),
    changes,
  };
}
