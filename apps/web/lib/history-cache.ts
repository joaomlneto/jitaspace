import { cacheLife } from "next/cache";

import { historyDb } from "@jitaspace/db-history";

import type { EntityTimeline, HistoryIndex } from "~/lib/history";
import { isBuildInHistoryScope } from "~/lib/history";

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
  const [diffs, builds] = await Promise.all([
    historyDb.buildDiff.findMany({ select: { id: true, toBuild: true } }),
    historyDb.build.findMany({
      select: { buildNumber: true, releasedAt: true, server: true },
    }),
  ]);
  const toBuildOf = new Map(diffs.map((d) => [d.id, d.toBuild]));
  const releasedAtOf = new Map(
    builds.map((b) => [b.buildNumber, b.releasedAt]),
  );
  const serverOf = new Map(builds.map((b) => [b.buildNumber, b.server]));

  const events = rows.flatMap((r) => {
    const build = toBuildOf.get(r.diffId);
    if (build === undefined) return [];
    const releasedAt = releasedAtOf.get(build) ?? null;
    // Drop events on out-of-scope builds — test-server (Singularity) builds and
    // pre-scope-floor builds (build 80313, the pre-2012 baseline) — so timelines
    // show only real Tranquility/SDE releases, consistent with the index.
    if (!isBuildInHistoryScope(releasedAt, serverOf.get(build) ?? null))
      return [];
    return [
      {
        build,
        date: ymd(releasedAt),
        collection: r.collection.name,
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
