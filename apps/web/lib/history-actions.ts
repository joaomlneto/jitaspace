"use server";

import { historyDb } from "@jitaspace/db-history";

import type { BuildChanges, EntityTimeline, HistoryIndex } from "~/lib/history";
import type {
  Counts,
  FileDiff,
  ResourceIndex,
  StringChange,
} from "~/lib/resource-history";

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

/** The HistoryIndex (SDE collections only; localization strings live elsewhere). */
export async function getHistoryIndex(): Promise<HistoryIndex> {
  const notStr = { name: { not: { startsWith: "strings:" } } };
  const [builds, collections, grouped, entities, diffs] = await Promise.all([
    historyDb.build.findMany({
      orderBy: { buildNumber: "asc" },
      select: { buildNumber: true, releasedAt: true },
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
    historyDb.entity.findMany({
      where: { kind: { not: { startsWith: "string:" } } },
      select: { kind: true, eveId: true },
    }),
    historyDb.buildDiff.findMany({ select: { id: true, toBuild: true } }),
  ]);

  const colName = new Map(collections.map((c) => [c.id, c.name]));
  const toBuildOf = new Map(diffs.map((d) => [d.id, d.toBuild]));
  const perBuild = new Map<number, Record<string, number>>();
  for (const g of grouped) {
    const name = colName.get(g.collectionId);
    const toBuild = toBuildOf.get(g.diffId);
    if (!name || toBuild === undefined) continue;
    const m = perBuild.get(toBuild) ?? {};
    m[name] = g._count;
    perBuild.set(toBuild, m);
  }

  const entityIdsByType: Record<string, number[]> = {};
  for (const e of entities) (entityIdsByType[e.kind] ??= []).push(e.eveId);
  for (const arr of Object.values(entityIdsByType)) arr.sort((a, b) => a - b);

  const buildsOut = builds.map((b) => {
    const byCollection = perBuild.get(b.buildNumber) ?? {};
    const changeCount = Object.values(byCollection).reduce((a, c) => a + c, 0);
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
    entityTypes: Object.keys(entityIdsByType),
    builds: buildsOut,
    entityIdsByType,
  };
}

/** Decoded-SDE changes for one build (reconstructed from the history DB). */
export async function getBuildChanges(
  build: number,
): Promise<BuildChanges | null> {
  if (!Number.isInteger(build)) return null;

  const b = await historyDb.build.findUnique({ where: { buildNumber: build } });
  if (!b) return null;

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

/** Timeline for any entity kind ("type", "skin", "skinMaterial", …). */
export async function getEntityTimeline(
  entityType: string,
  entityId: number,
): Promise<EntityTimeline | null> {
  if (!Number.isInteger(entityId)) return null;

  const rows = await historyDb.change.findMany({
    where: { entity: { kind: entityType, eveId: entityId } },
    select: {
      op: true,
      data: true,
      diff: {
        select: { to: { select: { buildNumber: true, releasedAt: true } } },
      },
      collection: { select: { name: true } },
    },
    orderBy: { diff: { toBuild: "asc" } },
  });
  if (rows.length === 0) return null;

  const events = rows.map((r) => ({
    build: r.diff.to.buildNumber,
    date: ymd(r.diff.to.releasedAt),
    collection: r.collection.name,
    v: 1 as const,
    kind: r.op,
    ...(r.op === "modified" ? { fields: r.data } : { values: r.data }),
  })) as EntityTimeline["events"];

  return { entityType, entityId, events };
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
      select: { buildNumber: true, releasedAt: true },
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
