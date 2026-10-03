import { cacheLife } from "next/cache";

import { buildsDb } from "@jitaspace/db-builds";

import type { BuildServer } from "~/lib/history";

/**
 * Reads behind the public build-diff API (`app/api/history/diff/`).
 *
 * The API serves only diffs the history database already stores — one
 * `BuildDiff` row per ordered pair of adjacent builds — and never composes a
 * range. That is what makes it safe to leave public: the set of answerable
 * keys is the set of stored diffs (at most one into each build), each answered
 * by one indexed read, so a caller enumerating pairs can neither run a range
 * aggregation nor mint unbounded cache entries. `/history/compare`'s arbitrary-range fold stays behind BotID
 * (`lib/history-actions.ts`).
 *
 * To keep it that way, a request is checked against the cached
 * {@link getCachedDiffGraph} before anything keyed on it is read: a made-up
 * pair or build is refused from memory, and the per-diff reads are keyed on a
 * diff id that exists.
 *
 * Unlike the `/history` viewer, nothing is narrowed to the history scope:
 * Singularity builds and the pre-2012 baseline are served too, labelled with
 * their `server`. Localization strings (`strings:*` collections) are left out,
 * as in the viewer's change counts. Genesis diffs (no `fromBuild`) are not
 * addressable by a pair, so they are not listed.
 */

export type DiffOp = "added" | "modified" | "removed";

/** Number of changed entities per op. */
export type DiffSummary = Record<DiffOp, number>;

export interface DiffBuildRef {
  build: number;
  /** Release date (YYYY-MM-DD); null when unknown. */
  date: string | null;
  /** Server whose build pointer surfaced it; null ⇒ SDE backfill. */
  server: BuildServer;
}

export interface DiffEntityChange {
  collection: string;
  entityType: string;
  entityId: number;
  op: DiffOp;
}

/** `GET /api/history/diff/{from}/{to}`. */
export interface BuildDiffResponse {
  from: DiffBuildRef;
  to: DiffBuildRef;
  summary: DiffSummary;
  changes: DiffEntityChange[];
}

export interface DiffLink extends DiffBuildRef {
  summary: DiffSummary;
  /** Where the diff itself is served. */
  url: string;
}

/** `GET /api/history/diff/{build}`. */
export interface BuildDiffIndexResponse extends DiffBuildRef {
  /** Builds with a stored diff *into* this one: `/diff/{that}/{this}`. */
  from: DiffLink[];
  /** Builds with a stored diff *out of* this one: `/diff/{this}/{that}`. */
  to: DiffLink[];
}

interface DiffEdge {
  id: number;
  fromBuild: number;
  toBuild: number;
}

interface DiffGraph {
  diffs: DiffEdge[];
  builds: Record<number, { date: string | null; server: BuildServer }>;
}

const notStrings = { name: { not: { startsWith: "strings:" } } };

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const emptySummary = (): DiffSummary => ({ added: 0, modified: 0, removed: 0 });

/** Where a build's diff listing is served. */
export const buildDiffsUrl = (build: number) => `/api/history/diff/${build}`;

/** Where a stored diff is served. */
export const diffUrl = (from: number, to: number) =>
  `${buildDiffsUrl(from)}/${to}`;

/**
 * Every stored diff between two builds, plus every build's date and server.
 * Small (one row per build and per diff), so `"minutes"`: matching
 * `GET /api/history` (`~/lib/history-meta`), which would otherwise link a
 * newly recorded build whose diffs these routes still answered 404 for.
 */
export async function getCachedDiffGraph(): Promise<DiffGraph> {
  "use cache";
  cacheLife("minutes");

  const [diffs, builds] = await Promise.all([
    buildsDb.buildDiff.findMany({
      where: { fromBuild: { not: null } },
      select: { id: true, fromBuild: true, toBuild: true },
    }),
    buildsDb.build.findMany({
      select: { buildNumber: true, releasedAt: true, server: true },
    }),
  ]);
  return {
    diffs: diffs.flatMap((d) =>
      d.fromBuild === null
        ? []
        : [{ id: d.id, fromBuild: d.fromBuild, toBuild: d.toBuild }],
    ),
    builds: Object.fromEntries(
      builds.map((b) => [
        b.buildNumber,
        { date: ymd(b.releasedAt), server: b.server },
      ]),
    ),
  };
}

/**
 * A build's date and server. A diff endpoint can lack its Build row while the
 * shared history DB is mid-migration, so that reads as unknown, not a crash.
 */
const buildRef = (graph: DiffGraph, build: number): DiffBuildRef => ({
  build,
  date: graph.builds[build]?.date ?? null,
  server: graph.builds[build]?.server ?? null,
});

/** One stored diff's entity changes, sorted, with their summary. */
async function getCachedDiffChanges(diffId: number): Promise<{
  summary: DiffSummary;
  changes: DiffEntityChange[];
}> {
  "use cache";
  // A stored diff is immutable once written; `"days"` rather than `"max"`
  // only so a diff read while its changes were still being inserted heals.
  cacheLife("days");

  const rows = await buildsDb.change.findMany({
    where: { diffId, collection: notStrings },
    select: {
      op: true,
      entity: { select: { kind: true, eveId: true } },
      collection: { select: { name: true } },
    },
  });
  const summary = emptySummary();
  const changes = rows
    .map((r) => {
      summary[r.op]++;
      return {
        collection: r.collection.name,
        entityType: r.entity.kind,
        entityId: r.entity.eveId,
        op: r.op,
      };
    })
    // Rows come back in no particular order; sort so a diff always
    // serializes to the same body.
    .sort(
      (a, b) =>
        a.collection.localeCompare(b.collection) ||
        a.entityType.localeCompare(b.entityType) ||
        a.entityId - b.entityId,
    );
  return { summary, changes };
}

/** Per-op change counts of the given diffs, by diff id. */
async function getCachedDiffSummaries(
  diffIds: number[],
): Promise<Record<number, DiffSummary>> {
  "use cache";
  cacheLife("days");

  const out: Record<number, DiffSummary> = {};
  for (const id of diffIds) out[id] = emptySummary();
  if (diffIds.length === 0) return out;
  const grouped = await buildsDb.change.groupBy({
    by: ["diffId", "op"],
    where: { diffId: { in: diffIds }, collection: notStrings },
    _count: true,
  });
  for (const g of grouped) {
    const summary = out[g.diffId];
    if (summary) summary[g.op] = g._count;
  }
  return out;
}

/**
 * The stored diff from `from` to `to`, or `null` when there is none — which
 * includes every pair that is not adjacent, since ranges are never composed.
 */
export async function readBuildDiff(
  from: number,
  to: number,
): Promise<BuildDiffResponse | null> {
  const graph = await getCachedDiffGraph();
  const diff = graph.diffs.find(
    (d) => d.fromBuild === from && d.toBuild === to,
  );
  if (!diff) return null;
  const { summary, changes } = await getCachedDiffChanges(diff.id);
  return {
    from: buildRef(graph, from),
    to: buildRef(graph, to),
    summary,
    changes,
  };
}

/**
 * A build's date and server, and the stored diffs into and out of it with
 * their summaries; `null` when the build is unknown.
 */
export async function readBuildDiffIndex(
  build: number,
): Promise<BuildDiffIndexResponse | null> {
  const graph = await getCachedDiffGraph();
  if (!(build in graph.builds)) return null;
  const incoming = graph.diffs.filter((d) => d.toBuild === build);
  const outgoing = graph.diffs.filter((d) => d.fromBuild === build);
  const summaries = await getCachedDiffSummaries(
    [...incoming, ...outgoing].map((d) => d.id).sort((a, b) => a - b),
  );
  const link = (d: DiffEdge, other: number): DiffLink => ({
    ...buildRef(graph, other),
    summary: summaries[d.id] ?? emptySummary(),
    url: diffUrl(d.fromBuild, d.toBuild),
  });
  const byBuild = (a: DiffLink, b: DiffLink) => a.build - b.build;
  return {
    ...buildRef(graph, build),
    from: incoming.map((d) => link(d, d.fromBuild)).sort(byBuild),
    to: outgoing.map((d) => link(d, d.toBuild)).sort(byBuild),
  };
}
