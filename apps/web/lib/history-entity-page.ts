import { cacheLife, cacheTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import type { EntityTimeline } from "~/lib/history";
import type { EntityRef, HistoryLabels } from "~/lib/history-labels";
import { prisma } from "~/lib/db";
import { getCachedEntityTimeline } from "~/lib/history-cache";
import { readEntityNames } from "~/lib/history-entity-names";
import { collectLabelRefs } from "~/lib/history-labels";
import { SDE_CACHE_TAG } from "~/lib/sdeCache";

/**
 * One entity's change history, ready to render: its timeline, its own name and
 * the labels of every id its values refer to.
 */
export interface EntityHistoryData {
  entityType: string;
  entityId: number;
  /** The entity's own name; null only when nothing names it. */
  name: string | null;
  /** Null when no change to the entity was recorded. */
  timeline: EntityTimeline | null;
  labels: HistoryLabels;
}

/**
 * {@link EntityHistoryData} for one entity, read on the server so the history
 * pages and tabs arrive complete — the browser fetches nothing for them.
 *
 * Cached per entity for a day, like the timeline it is built on
 * (`getCachedEntityTimeline`), and tagged `sde`: the labels come from our SDE
 * tables, so an ingest refreshes them. A `"use cache: remote"` entry, shared
 * across instances: the item page renders per request and streams this into its
 * History tab, so a per-instance entry would seldom be hit again and each view
 * would re-read seconds of history. An entry over the Runtime Cache's 2 MB cap
 * (the largest item measured is ~750 KB) is silently not stored, and is read
 * again next time. Throws on failure — nothing here catches — so an outage
 * fails the read instead of caching a wrong page.
 */
export async function getCachedEntityHistory(
  entityType: string,
  entityId: number,
): Promise<EntityHistoryData> {
  "use cache: remote";
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);

  const timeline = await getCachedEntityTimeline(entityType, entityId);
  // Names as of the entity's latest recorded build, for whatever our SDE
  // tables do not have yet.
  const atBuild = timeline?.events.at(-1)?.build;
  const self = { kind: entityType, id: entityId };
  const labels = await readHistoryLabels(
    [self, ...collectLabelRefs(timeline)],
    atBuild,
  );
  return {
    entityType,
    entityId,
    name: labels.names[entityType]?.[entityId] ?? null,
    timeline,
    labels,
  };
}

/**
 * {@link getCachedEntityHistory} for a page that renders fine without its
 * History tab (the item, race, faction, dungeon, mission and epic-arc pages). A
 * failure is reported and hides the tab, and `connection()` keeps that
 * degraded render out of the page's ISR cache, so the next request retries
 * instead of the cache serving the page without its history.
 *
 * So is a read that takes over {@link HISTORY_TIMEOUT_MS}: the item page
 * streams this into its tab, so a stalled history database would otherwise
 * hold the response open until the function timed out.
 */
export async function loadEntityHistory(
  entityType: string,
  entityId: number,
): Promise<EntityHistoryData | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(new Error(`Entity history took over ${HISTORY_TIMEOUT_MS} ms`)),
      HISTORY_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([
      getCachedEntityHistory(entityType, entityId),
      timeout,
    ]);
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "entity-history" } });
    // Imported here, on the failure path only: `next/server` cannot load in the
    // jsdom suites that import the six host pages.
    const { connection } = await import("next/server");
    await connection();
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** How long a host page waits for an entity's history before going without. */
export const HISTORY_TIMEOUT_MS = 10_000;

/** How deep a market group's parent chain is followed. */
const MAX_MARKET_GROUP_DEPTH = 12;

/**
 * Labels for `refs`: their names ({@link readEntityNames}, our SDE tables first,
 * then the history database as of `atBuild`), each type's group and each
 * group's category for the breadcrumbs, each market group's parents up to the
 * root, and each dogma attribute's unit and direction.
 */
export async function readHistoryLabels(
  refs: readonly EntityRef[],
  atBuild?: number,
): Promise<HistoryLabels> {
  const ids = (kind: string) => [
    ...new Set(refs.filter((r) => r.kind === kind).map((r) => r.id)),
  ];

  const [types, attributes] = await Promise.all([
    prisma.type.findMany({
      where: { typeId: { in: ids("type") } },
      select: { typeId: true, groupId: true },
    }),
    prisma.dogmaAttribute.findMany({
      where: { attributeId: { in: ids("dogmaAttribute") } },
      select: { attributeId: true, unitId: true, highIsGood: true },
    }),
  ]);
  const groupIds = [
    ...new Set([...ids("group"), ...types.map((t) => t.groupId)]),
  ];
  const unitIds = [
    ...new Set([
      ...ids("dogmaUnit"),
      ...attributes.flatMap((a) => (a.unitId === null ? [] : [a.unitId])),
    ]),
  ];
  const [groups, units, marketGroupParents] = await Promise.all([
    prisma.group.findMany({
      where: { groupId: { in: groupIds } },
      select: { groupId: true, categoryId: true },
    }),
    prisma.dogmaUnit.findMany({
      where: { unitId: { in: unitIds } },
      select: { unitId: true, displayName: true, name: true },
    }),
    readMarketGroupParents(ids("marketGroup")),
  ]);

  const all: EntityRef[] = [
    ...refs,
    ...groupIds.map((id) => ({ kind: "group", id })),
    ...groups.map((g) => ({ kind: "category", id: g.categoryId })),
    ...Object.values(marketGroupParents).map((id) => ({
      kind: "marketGroup",
      id,
    })),
    ...unitIds.map((id) => ({ kind: "dogmaUnit", id })),
  ];
  const names = await readEntityNames(
    all.map((r) => ({ entityType: r.kind, entityId: r.id })),
    atBuild,
  );

  const unitSymbols: Record<number, string> = {};
  for (const u of units) {
    const symbol = [u.displayName, u.name].find((s) => s?.trim());
    if (symbol) unitSymbols[u.unitId] = symbol.trim();
  }
  return {
    names,
    parents: {
      type: Object.fromEntries(types.map((t) => [t.typeId, t.groupId])),
      group: Object.fromEntries(groups.map((g) => [g.groupId, g.categoryId])),
      marketGroup: marketGroupParents,
    },
    attributes: Object.fromEntries(
      attributes.map((a) => [
        a.attributeId,
        { unitId: a.unitId, highIsGood: a.highIsGood },
      ]),
    ),
    unitSymbols,
  };
}

/**
 * Each market group's parent, following every chain up to its root: one query
 * per level, for every chain at once, at most {@link MAX_MARKET_GROUP_DEPTH}
 * levels deep. `seen` stops a chain that loops.
 */
async function readMarketGroupParents(
  frontier: readonly number[],
  seen = new Set<number>(frontier),
  depth = 0,
): Promise<Record<number, number>> {
  if (frontier.length === 0 || depth >= MAX_MARKET_GROUP_DEPTH) return {};
  const rows = await prisma.marketGroup.findMany({
    where: { marketGroupId: { in: [...frontier] } },
    select: { marketGroupId: true, parentMarketGroupId: true },
  });
  const parents: Record<number, number> = {};
  const next: number[] = [];
  for (const { marketGroupId, parentMarketGroupId } of rows) {
    if (parentMarketGroupId === null) continue;
    parents[marketGroupId] = parentMarketGroupId;
    if (!seen.has(parentMarketGroupId)) {
      seen.add(parentMarketGroupId);
      next.push(parentMarketGroupId);
    }
  }
  return {
    ...parents,
    ...(await readMarketGroupParents(next, seen, depth + 1)),
  };
}
