import { cacheLife } from "next/cache";

import { historyDb } from "@jitaspace/db-history";

import type { BuildPage, EntityChangeRow } from "~/lib/history";
import type { FileDiff, StringChange } from "~/lib/resource-history";
import { prisma } from "~/lib/db";
import { isBuildInHistoryScope } from "~/lib/history";

/**
 * The build page's data, read on the server so the page is served complete: no
 * client fetches, and in particular no per-row type-name lookup — that used to
 * be one server action per type, and Next runs server actions one at a time, so
 * a build touching a thousand types took minutes to finish naming them.
 *
 * Cached per build for a day, matching the other history reads
 * (`lib/history-cache.ts`): a processed build's diffs only change when a
 * backfill connects a new diff onto it, and type names only when the SDE is
 * re-ingested. Unlike the `/history` index, this read is safe to render on the
 * server: `next build` never reaches it — the only build it prerenders is a
 * placeholder the page 404s first (see `generateStaticParams`) — so the
 * unprovisioned history DB in CI is never queried.
 *
 * Every read throws on failure — nothing here catches — so a database outage
 * fails the render instead of caching a wrong page for a day.
 */

type Op = "added" | "modified" | "removed";

const STRINGS_PREFIX = "strings:";

const opKey = (op: Op) => (op === "modified" ? "changed" : op);

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Everything `/history/build/[build]` renders; `null` when the build does not
 * exist or is outside the history scope (a Singularity build, or the pre-2012
 * baseline), which the page answers with a 404.
 */
export async function getCachedBuildPage(
  build: number,
): Promise<BuildPage | null> {
  "use cache";
  cacheLife("days");

  const b = await historyDb.build.findUnique({
    where: { buildNumber: build },
    select: { releasedAt: true, server: true },
  });
  if (!b || !isBuildInHistoryScope(b.releasedAt, b.server)) return null;

  const [{ changes, typeNames }, files, strings] = await Promise.all([
    readEntityChanges(build),
    readFileDiff(build),
    readStringChanges(build),
  ]);
  return { build, date: ymd(b.releasedAt), changes, typeNames, files, strings };
}

/** Decoded-SDE changes, plus the names of the types among them. */
async function readEntityChanges(build: number) {
  const rows = await historyDb.change.findMany({
    where: {
      diff: { toBuild: build },
      collection: { name: { not: { startsWith: STRINGS_PREFIX } } },
    },
    select: {
      op: true,
      entity: { select: { kind: true, eveId: true } },
      collection: { select: { name: true } },
    },
  });
  const changes: EntityChangeRow[] = rows.map((c) => ({
    entityId: c.entity.eveId,
    entityType: c.entity.kind,
    collection: c.collection.name,
    kind: c.op,
  }));
  const typeIds = new Set(
    changes.filter((c) => c.entityType === "type").map((c) => c.entityId),
  );
  return { changes, typeNames: await readTypeNames([...typeIds]) };
}

/** Type names from our SDE tables; blank names are left out, like unknown ids. */
async function readTypeNames(
  typeIds: number[],
): Promise<Record<number, string>> {
  if (typeIds.length === 0) return {};
  const rows = await prisma.type.findMany({
    select: { typeId: true, name: true },
    where: { typeId: { in: typeIds } },
  });
  const names: Record<number, string> = {};
  for (const { typeId, name } of rows) {
    if (name.trim() !== "") names[typeId] = name;
  }
  return names;
}

async function readFileDiff(build: number): Promise<FileDiff> {
  const rows = await historyDb.fileChange.findMany({
    where: { diff: { toBuild: build } },
    select: { path: true, op: true },
  });
  const files: FileDiff = { added: [], changed: [], removed: [] };
  for (const r of rows) files[opKey(r.op)].push(r.path);
  return files;
}

async function readStringChanges(
  build: number,
): Promise<Record<string, StringChange[]>> {
  const rows = await historyDb.change.findMany({
    where: {
      diff: { toBuild: build },
      collection: { name: { startsWith: STRINGS_PREFIX } },
    },
    select: {
      op: true,
      data: true,
      entity: { select: { eveId: true } },
      collection: { select: { name: true } },
    },
  });
  const byLang: Record<string, StringChange[]> = {};
  for (const r of rows) {
    const lang = r.collection.name.slice(STRINGS_PREFIX.length);
    const { from, to } = (r.data ?? {}) as { from?: string; to?: string };
    // Absent sides are omitted rather than set to `undefined`, which the RSC
    // payload would spell out for each of what can be tens of thousands of rows.
    byLang[lang] ??= [];
    byLang[lang].push({
      id: r.entity.eveId,
      kind: opKey(r.op),
      ...(from === undefined ? {} : { from }),
      ...(to === undefined ? {} : { to }),
    });
  }
  return byLang;
}
