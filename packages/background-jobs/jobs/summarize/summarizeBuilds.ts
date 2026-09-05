import { historyDb } from "@jitaspace/db-history";

import type { BuildDigest, CollectionSample } from "./digest";
import { defineJob } from "../../core";
import { prisma } from "../../db";
import { env } from "../../env";
import { firstNonEmpty } from "../../utils/firstNonEmpty";
import { SAMPLE_LIMIT } from "./digest";
import { PROMPT_VERSION, summarizeBuild, SUMMARY_MODEL } from "./summarize";

export interface SummarizeBuildsEventPayload {
  data: Record<string, never>;
}

export interface SummarizeBuildsResult {
  /** Builds that had no usable summary and were considered this run. */
  candidates: number;
  generated: number;
  /** Model returned nothing usable — left unsummarised for a later run. */
  skipped: number;
  failed: number;
  /** Set when the job could not run at all (no API key, history DB down). */
  reason?: string;
}

/**
 * Inclusive release-date floor for builds we describe.
 *
 * Mirrors `HISTORY_MIN_RELEASE_DATE` / `isBuildInHistoryScope` in
 * `apps/web/lib/history.ts` — the viewer hides test-server builds and the
 * pre-2012 SDE-backfill baseline, and there is no point summarising a build the
 * site will never show. The rule is duplicated rather than imported because a
 * package cannot depend on the web app; keep the two in step.
 */
const MIN_RELEASE_DATE = new Date("2012-03-14T00:00:00.000Z");

/**
 * How many builds to summarise per run. Bounds the spend of any single run and,
 * because the job is scheduled daily and CCP ships a handful of builds a month,
 * still clears a backlog quickly.
 */
const MAX_PER_RUN = 5;

/**
 * How many builds a run may look at while trying to fill those slots.
 *
 * A build with nothing to describe costs two history queries and no model call,
 * so it does not spend a slot — otherwise a handful of them at the head of the
 * queue would consume every run forever and the backlog would never drain
 * (`todo` is rebuilt newest-first each run from "has no summary row", and only
 * a successful generation writes one). This bounds the scan those cheap skips
 * are allowed to do.
 */
const MAX_EXAMINED_PER_RUN = 50;

/** Collections whose names are worth sampling — the ones a player would recognise. */
const SAMPLED_COLLECTIONS = [
  "types",
  "skins",
  "marketGroups",
  "dogmaAttributes",
];

/**
 * Generates the missing one-sentence build summaries.
 *
 * Immutable inputs, so this only ever fills gaps: a build with a current summary
 * is never re-sent to the model. Bumping `PROMPT_VERSION` is what makes existing
 * rows eligible again.
 */
export const summarizeBuilds = defineJob<
  SummarizeBuildsEventPayload["data"],
  SummarizeBuildsResult
>({
  id: "summarize-builds",
  name: "Summarize EVE client builds",
  description:
    "Daily: writes the one-sentence description shown for any recorded build that does not have a current one.",
  trigger: { type: "cron", cron: "TZ=UTC 30 5 * * *" },
  singleton: true,
  retries: 1,
  handler: async (ctx) => {
    const empty: SummarizeBuildsResult = {
      candidates: 0,
      generated: 0,
      skipped: 0,
      failed: 0,
    };

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Registered but unconfigured is a normal state, not a failure — the site
      // falls back to its static wording until the key is set.
      ctx.logger.info("ANTHROPIC_API_KEY is not set; skipping.");
      return { ...empty, reason: "no-api-key" };
    }

    // In-scope builds, newest first: a fresh patch is the one people look at.
    const builds = await historyDb.build.findMany({
      where: {
        AND: [
          // Spelled out rather than `server: { not: "singularity" }`: that
          // compiles to a bare `<>`, and under SQL's three-valued logic
          // `NULL <> 'singularity'` is NULL, so every null-server row would be
          // dropped. A null server is the SDE backfill, which
          // `isBuildInHistoryScope` deliberately keeps.
          { OR: [{ server: null }, { server: { not: "singularity" } }] },
          {
            OR: [
              { releasedAt: null },
              { releasedAt: { gte: MIN_RELEASE_DATE } },
            ],
          },
        ],
      },
      select: { buildNumber: true, releasedAt: true },
      orderBy: { buildNumber: "desc" },
    });
    if (builds.length === 0) return { ...empty, reason: "no-builds" };

    const current = await prisma.buildSummary.findMany({
      where: {
        buildNumber: { in: builds.map((b) => b.buildNumber) },
        promptVersion: PROMPT_VERSION,
      },
      select: { buildNumber: true },
    });
    const done = new Set(current.map((s) => s.buildNumber));
    const todo = builds.filter((b) => !done.has(b.buildNumber));

    const result: SummarizeBuildsResult = { ...empty, candidates: todo.length };

    let attempted = 0;
    let examined = 0;
    for (const build of todo) {
      if (attempted >= MAX_PER_RUN || examined >= MAX_EXAMINED_PER_RUN) break;
      examined += 1;
      try {
        const digest = await buildDigest(build.buildNumber, build.releasedAt);
        // Nothing recorded against this build — no sentence to write. This is
        // deterministic, so it will be true on every future run too; skip
        // without spending one of the run's model calls and move on.
        if (digest.counts.length === 0) {
          result.skipped += 1;
          continue;
        }

        attempted += 1;

        const summary = await summarizeBuild(digest, { apiKey });
        if (!summary) {
          ctx.logger.warn(
            `No usable summary for build ${build.buildNumber}; leaving it for a later run.`,
          );
          result.skipped += 1;
          continue;
        }

        await prisma.buildSummary.upsert({
          where: { buildNumber: build.buildNumber },
          create: {
            buildNumber: build.buildNumber,
            summary,
            model: SUMMARY_MODEL,
            promptVersion: PROMPT_VERSION,
          },
          update: {
            summary,
            model: SUMMARY_MODEL,
            promptVersion: PROMPT_VERSION,
          },
        });
        result.generated += 1;
      } catch (error) {
        // One bad build must not strand the rest of the backlog.
        ctx.logger.error(
          `Failed to summarize build ${build.buildNumber}: ${String(error)}`,
        );
        result.failed += 1;
      }
    }

    return result;
  },
});

/**
 * Assembles one build's digest: per-collection counts from the history database,
 * plus a sample of real entity names from our own SDE tables.
 */
async function buildDigest(
  build: number,
  releasedAt: Date | null,
): Promise<BuildDigest> {
  const [diffs, rows] = await Promise.all([
    historyDb.buildDiff.findMany({
      where: { toBuild: build },
      select: { fromBuild: true },
    }),
    historyDb.change.findMany({
      where: {
        diff: { toBuild: build },
        collection: { name: { not: { startsWith: "strings:" } } },
      },
      select: {
        op: true,
        collection: { select: { name: true } },
        entity: { select: { kind: true, eveId: true, name: true } },
      },
    }),
  ]);

  const counts = new Map<
    string,
    { collection: string; added: number; modified: number; removed: number }
  >();
  // Ids worth naming, kept in encounter order so the sample is stable per build.
  const sampleIds = new Map<string, { kind: string; ids: number[] }>();

  for (const row of rows) {
    const collection = row.collection.name;
    const tally = counts.get(collection) ?? {
      collection,
      added: 0,
      modified: 0,
      removed: 0,
    };
    tally[row.op] += 1;
    counts.set(collection, tally);

    // Only added/removed are worth naming — "changed" lists say little in one
    // sentence, and the sample is capped to keep the prompt small.
    if (row.op === "modified") continue;
    if (!SAMPLED_COLLECTIONS.includes(collection)) continue;
    const key = `${collection}:${row.op}`;
    const bucket = sampleIds.get(key) ?? { kind: row.entity.kind, ids: [] };
    if (
      bucket.ids.length < SAMPLE_LIMIT &&
      !bucket.ids.includes(row.entity.eveId)
    )
      bucket.ids.push(row.entity.eveId);
    sampleIds.set(key, bucket);
  }

  const samples: CollectionSample[] = [];
  for (const [key, { kind, ids }] of sampleIds) {
    const [collection, op] = key.split(":") as [string, "added" | "removed"];
    const names = await resolveSampleNames(kind, ids);
    if (names.length > 0) samples.push({ collection, op, names });
  }

  return {
    build,
    date: releasedAt ? releasedAt.toISOString().slice(0, 10) : null,
    // Multiple diffs can target one build; the lowest baseline is the useful one.
    // Genesis diffs (`fromBuild: null`) are dropped rather than folded: a build
    // that has both a genesis diff and a real one is mid-timeline, and calling
    // it "first recorded" would be a claim the digest cannot support. `findMany`
    // has no `orderBy`, so this must not depend on which row comes back first.
    fromBuild: lowestBaseline(diffs),
    counts: [...counts.values()],
    samples,
  };
}

/**
 * Lowest real baseline among a build's diffs, ignoring genesis (null) ones.
 *
 * Exported so the order-independence can be tested: the fold this replaced was
 * seeded with `diffs[0].fromBuild` and short-circuited once that seed was null,
 * so an unordered `findMany` returning the genesis row first erased every real
 * baseline behind it.
 */
export function lowestBaseline(
  diffs: { fromBuild: number | null }[],
): number | null {
  const baselines = diffs
    .map((d) => d.fromBuild)
    .filter((from): from is number => from !== null);
  return baselines.length > 0 ? Math.min(...baselines) : null;
}

/**
 * Names for a sample of ids. Only the handful of kinds worth naming in a
 * sentence — anything else stays a bare id and simply isn't sampled.
 */
async function resolveSampleNames(
  kind: string,
  ids: number[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    switch (kind) {
      case "type":
        return (
          await prisma.type.findMany({
            where: { typeId: { in: ids } },
            select: { name: true },
          })
        )
          .map((r) => r.name.trim())
          .filter(Boolean);
      case "skin":
        return (
          await prisma.skin.findMany({
            where: { skinId: { in: ids } },
            select: { internalName: true },
          })
        )
          .map((r) => r.internalName.trim())
          .filter(Boolean);
      case "marketGroup":
        return (
          await prisma.marketGroup.findMany({
            where: { marketGroupId: { in: ids } },
            select: { name: true },
          })
        )
          .map((r) => r.name.trim())
          .filter(Boolean);
      case "dogmaAttribute":
        return (
          await prisma.dogmaAttribute.findMany({
            where: { attributeId: { in: ids } },
            select: { displayName: true, name: true },
          })
        )
          .map((r) => firstNonEmpty(r.displayName, r.name))
          .filter((name): name is string => name !== undefined);
      default:
        return [];
    }
  } catch {
    // Names are flavour; a failed lookup just means a vaguer sentence.
    return [];
  }
}
