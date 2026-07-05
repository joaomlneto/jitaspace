"use server";

import { historyDb } from "@jitaspace/db-history";

import type { BuildChanges, EntityTimeline } from "~/lib/history";
import type {
  Counts,
  FileDiff,
  ResourceIndex,
  StringChange,
} from "~/lib/resource-history";
import { isBuildInHistoryScope } from "~/lib/history";
import { getCachedEntityTimeline } from "~/lib/history-cache";

/**
 * Server functions backing the change-history viewer. Each queries the
 * standalone history database (@jitaspace/db-history) directly on the server
 * and returns the shaped, typed payload — there is no public REST surface.
 * Client components invoke these (e.g. as React Query `queryFn`s); Next.js
 * keeps the Prisma client and the connection string server-side.
 *
 * A change/file-change hangs off an immutable {@link BuildDiff} (an ordered
 * build pair), not a single build — so "changes in build N" is the diff whose
 * `toBuild` is N, and the build axis is recovered via `diff.toBuild`.
 *
 * "Not found" resolves to `null` so callers can render an empty state.
 */

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const opKey = (op: "added" | "modified" | "removed") =>
  op === "modified" ? "changed" : op;

/**
 * Whether a build number is within the change-history scope, per
 * {@link isBuildInHistoryScope}. Used to gate the build-addressed readers so a
 * direct request for an out-of-scope build — a test-server (Singularity) build,
 * or the pre-2012 baseline (build 80313) — resolves to "not found" rather than
 * serving its data.
 */
const isBuildNumberInScope = async (build: number): Promise<boolean> => {
  const b = await historyDb.build.findUnique({
    where: { buildNumber: build },
    select: { releasedAt: true, server: true },
  });
  return b !== null && isBuildInHistoryScope(b.releasedAt, b.server);
};

/**
 * The HistoryIndex is read directly from the day-cached {@link getCachedHistoryIndex}
 * by the `/history` page's server component (see `app/history/page.tsx`), not
 * through a server action — so there is no `getHistoryIndex` action here.
 */

/** Decoded-SDE changes for one build (reconstructed from the history DB). */
export async function getBuildChanges(
  build: number,
): Promise<BuildChanges | null> {
  if (!Number.isInteger(build)) return null;

  const b = await historyDb.build.findUnique({ where: { buildNumber: build } });
  if (!b) return null;
  // Out of scope — a test-server (Singularity) build or the pre-2012 baseline
  // (build 80313) — renders an empty state.
  if (!isBuildInHistoryScope(b.releasedAt, b.server)) return null;

  const rows = await historyDb.change.findMany({
    where: {
      diff: { toBuild: build },
      collection: { name: { not: { startsWith: "strings:" } } },
    },
    select: {
      op: true,
      data: true,
      entity: { select: { kind: true, eveId: true } },
      collection: { select: { name: true } },
    },
  });

  const changes = rows.map((c) => ({
    entityId: c.entity.eveId,
    entityType: c.entity.kind,
    collection: c.collection.name,
    v: 1 as const,
    kind: c.op,
    ...(c.op === "modified" ? { fields: c.data } : { values: c.data }),
  })) as BuildChanges["changes"];

  return { build, date: ymd(b.releasedAt), changes };
}

/**
 * Timeline for any entity kind ("type", "skin", "skinMaterial", …).
 *
 * Delegates to the day-cached {@link getCachedEntityTimeline} (keyed per
 * entityType+entityId) so the standalone history pages and the embedded History
 * tabs share one cache entry per entity rather than re-querying on every view.
 */
export async function getEntityTimeline(
  entityType: string,
  entityId: number,
): Promise<EntityTimeline | null> {
  return getCachedEntityTimeline(entityType, entityId);
}

/** The ResourceIndex — file + localization-string change counts per build. */
export async function getResourceIndex(): Promise<ResourceIndex> {
  const strFilter = { name: { startsWith: "strings:" } };
  const [fileAgg, strColls, strAgg, builds, diffs] = await Promise.all([
    historyDb.fileChange.groupBy({ by: ["diffId", "op"], _count: true }),
    historyDb.collection.findMany({
      where: strFilter,
      select: { id: true, name: true },
    }),
    historyDb.change.groupBy({
      by: ["diffId", "collectionId", "op"],
      where: { collection: strFilter },
      _count: true,
    }),
    historyDb.build.findMany({
      select: { buildNumber: true, releasedAt: true, server: true },
    }),
    historyDb.buildDiff.findMany({ select: { id: true, toBuild: true } }),
  ]);

  const buildInfo = new Map(builds.map((b) => [b.buildNumber, b]));
  const langOf = new Map(
    strColls.map((c) => [c.id, c.name.replace("strings:", "")]),
  );
  const languages = strColls.map((c) => c.name.replace("strings:", "")).sort();
  const toBuildOf = new Map(diffs.map((d) => [d.id, d.toBuild]));

  const perBuild = new Map<
    number,
    { files: Counts; strings: Record<string, Counts> }
  >();
  const ensure = (bid: number) => {
    let a = perBuild.get(bid);
    if (!a) {
      a = { files: { added: 0, changed: 0, removed: 0 }, strings: {} };
      perBuild.set(bid, a);
    }
    return a;
  };
  for (const g of fileAgg) {
    const toBuild = toBuildOf.get(g.diffId);
    if (toBuild !== undefined) ensure(toBuild).files[opKey(g.op)] += g._count;
  }
  for (const g of strAgg) {
    const lang = langOf.get(g.collectionId);
    const toBuild = toBuildOf.get(g.diffId);
    if (!lang || toBuild === undefined) continue;
    const a = ensure(toBuild);
    (a.strings[lang] ??= { added: 0, changed: 0, removed: 0 })[opKey(g.op)] +=
      g._count;
  }

  const out: ResourceIndex["builds"] = [];
  for (const [bid, v] of perBuild) {
    const b = buildInfo.get(bid);
    if (!b) continue;
    // Skip out-of-scope builds — test-server (Singularity) builds and the
    // pre-2012 baseline (build 80313) — as the SDE index does.
    if (!isBuildInHistoryScope(b.releasedAt, b.server)) continue;
    out.push({
      build: b.buildNumber,
      date: ymd(b.releasedAt),
      files: v.files,
      strings: v.strings,
    });
  }
  out.sort((a, b) => a.build - b.build);

  return { generatedAt: new Date().toISOString(), languages, builds: out };
}

/** Per-build raw-file diff (added / changed / removed paths). */
export async function getFileDiff(build: number): Promise<FileDiff | null> {
  if (!(await isBuildNumberInScope(build))) return null;

  const rows = await historyDb.fileChange.findMany({
    where: { diff: { toBuild: build } },
    select: { path: true, op: true },
  });
  if (rows.length === 0) return null;

  return {
    added: rows.filter((r) => r.op === "added").map((r) => r.path),
    changed: rows.filter((r) => r.op === "modified").map((r) => r.path),
    removed: rows.filter((r) => r.op === "removed").map((r) => r.path),
  };
}

/** Per-build localization-string changes for one language. */
export async function getStringChanges(
  build: number,
  lang: string,
): Promise<StringChange[] | null> {
  if (!(await isBuildNumberInScope(build))) return null;

  const rows = await historyDb.change.findMany({
    where: {
      diff: { toBuild: build },
      collection: { name: `strings:${lang}` },
    },
    select: { op: true, data: true, entity: { select: { eveId: true } } },
  });
  if (rows.length === 0) return null;

  return rows.map((r) => {
    const data = (r.data ?? {}) as { from?: string; to?: string };
    return {
      id: r.entity.eveId,
      kind: r.op === "modified" ? "changed" : r.op,
      from: data.from,
      to: data.to,
    };
  });
}
