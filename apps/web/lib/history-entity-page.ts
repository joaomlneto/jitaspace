import { cacheLife, cacheTag } from "next/cache";

import type { EntityTimeline } from "~/lib/history";
import type { EntityRef, HistoryLabels } from "~/lib/history-labels";
import { prisma } from "~/lib/db";
import { getCachedEntityTimeline } from "~/lib/history-cache";
import { readEntityNames, readMessages } from "~/lib/history-entity-names";
import { collectLabelRefs, MESSAGE_KIND } from "~/lib/history-labels";
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
 * {@link EntityHistoryData} for one entity: read on the server by the
 * `/history` pages, and served to the History tabs of the item, race, faction,
 * station, constellation, region, dungeon, mission and epic-arc pages by
 * `/api/history/entity/[entityType]/[id]`, which those tabs fetch when they
 * open. The host pages are cached whole and never read it themselves: inside an
 * ISR page's background render, a history read that throws or stalls fails the
 * render however the page catches it (measured 2026-11 under `next start`; the
 * request waiting on the render got a 500).
 *
 * Cached per entity for a day, like the timeline it is built on
 * (`getCachedEntityTimeline`), and tagged `sde`: the labels come from our SDE
 * tables, so an ingest refreshes them. A `"use cache: remote"` entry, shared
 * across instances: the tabs' route renders per request, so a per-instance
 * entry would seldom be hit again and each view would re-read seconds of
 * history. An entry over the Runtime Cache's 2 MB cap
 * (the largest item measured is ~750 KB) is silently not stored, and is read
 * again next time. Throws on failure — nothing here catches — so an outage
 * fails the read instead of caching a wrong page.
 *
 * So does a read that takes over {@link HISTORY_READ_TIMEOUT_MS}, and the
 * bound has to be in here, inside the cache scope. A render waits for every
 * cache entry it starts to fill, and a history database that accepts
 * connections but never answers held an ISR page's background render open
 * with nothing to end it: under `next start` every later request for the page
 * then waited on it, indefinitely (2026-11, measured on `/race/[raceId]` when
 * it still read its History tab in-render). A timeout in the caller frees the
 * request, not the render.
 */
export async function getCachedEntityHistory(
  entityType: string,
  entityId: number,
): Promise<EntityHistoryData> {
  "use cache: remote";
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);

  return withTimeout(
    readEntityHistory(entityType, entityId),
    HISTORY_READ_TIMEOUT_MS,
    `Entity history read took over ${HISTORY_READ_TIMEOUT_MS} ms`,
  );
}

/** The uncached body of {@link getCachedEntityHistory}. */
async function readEntityHistory(
  entityType: string,
  entityId: number,
): Promise<EntityHistoryData> {
  const timeline = await getCachedEntityTimeline(entityType, entityId);
  // Names as of the entity's latest recorded build, for whatever our SDE
  // tables do not have yet.
  const atBuild = timeline?.events.at(-1)?.build;
  const self = { kind: entityType, id: entityId };
  const labels = await readHistoryLabels(
    [self, ...collectLabelRefs(timeline)],
    atBuild,
  );
  const name = labels.names[entityType]?.[entityId] ?? null;
  // The strings history holds only the messages that changed since it began,
  // so an old entity's own name message (its `typeNameID`, `nameID`, …) may be
  // missing from it, while the entity is named all the same.
  if (name !== null)
    for (const id of currentNameMessageIds(timeline))
      labels.messages[id] ??= name;
  return { entityType, entityId, name, timeline, labels };
}

/**
 * How long the history read itself may run: room for a cold one (2–4 s; the
 * largest entity measured is ~750 KB), and shorter than the 50 s Next allows a
 * cache entry to fill while it prerenders.
 */
export const HISTORY_READ_TIMEOUT_MS = 20_000;

/** `promise`, or a rejection with `message` once `ms` have passed. */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Whether `field` holds one of an entity's own name messages. */
const isNameField = (field: string) =>
  field.endsWith("NameID") || field === "nameID";

/**
 * What one event does to an entity's name fields: `[field, value]` for each it
 * sets, `[field, undefined]` for each it removes. A removal's pre-image sets
 * nothing: the entity was gone, not renamed.
 */
function nameFieldUpdates(
  event: EntityTimeline["events"][number],
): [string, unknown][] {
  if (event.kind === "added")
    return Object.entries(event.values ?? {}).filter(([f]) => isNameField(f));
  if (event.kind === "modified")
    return Object.entries(event.fields)
      .filter(([f]) => isNameField(f))
      .map(([f, delta]) => [f, "to" in delta ? delta.to : undefined]);
  return [];
}

/**
 * The message ids an entity is named by now: the latest value of each of its
 * top-level `…NameID` / `nameID` fields across the timeline. Only these may be
 * filled in with the entity's current name; a name message it had earlier
 * named it something else.
 */
function currentNameMessageIds(timeline: EntityTimeline | null): number[] {
  const current = new Map<string, unknown>();
  for (const event of timeline?.events ?? [])
    for (const [field, value] of nameFieldUpdates(event))
      if (value === undefined) current.delete(field);
      else current.set(field, value);
  return [...current.values()].filter(
    (id): id is number => typeof id === "number",
  );
}

/** How deep a market group's parent chain is followed. */
const MAX_MARKET_GROUP_DEPTH = 12;

/**
 * Labels for `refs`: their names ({@link readEntityNames}, our SDE tables first,
 * then the history database as of `atBuild`), each type's group and each
 * group's category for the breadcrumbs, each market group's parents up to the
 * root, and each dogma attribute's unit and direction.
 */
export async function readHistoryLabels(
  allRefs: readonly EntityRef[],
  atBuild?: number,
): Promise<HistoryLabels> {
  const refs = allRefs.filter((r) => r.kind !== MESSAGE_KIND);
  const ids = (kind: string) => [
    ...new Set(refs.filter((r) => r.kind === kind).map((r) => r.id)),
  ];
  const messageIds = [
    ...new Set(allRefs.filter((r) => r.kind === MESSAGE_KIND).map((r) => r.id)),
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
  const [groups, units, marketGroupParents, messages] = await Promise.all([
    prisma.group.findMany({
      where: { groupId: { in: groupIds } },
      select: { groupId: true, categoryId: true },
    }),
    prisma.dogmaUnit.findMany({
      where: { unitId: { in: unitIds } },
      select: { unitId: true, displayName: true, name: true },
    }),
    readMarketGroupParents(ids("marketGroup")),
    readMessages(messageIds, atBuild ?? Number.MAX_SAFE_INTEGER),
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
    messages: Object.fromEntries(messages),
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
