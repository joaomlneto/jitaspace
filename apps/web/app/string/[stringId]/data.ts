import { cacheLife } from "next/cache";

import { historyDb } from "@jitaspace/db-history";

import type { StringEvent, StringHistory } from "~/lib/resource-pages";
import { readDiffBuilds } from "~/lib/history-build-axis";
import { compareLanguages } from "~/lib/resource-pages";

const STRINGS_PREFIX = "strings:";
const OP = { added: "added", modified: "changed", removed: "removed" } as const;

/**
 * Every recorded change to localization string `stringId`, in every language
 * and on every server, oldest build first; `null` when none was recorded.
 *
 * Each language is its own entity (`string:<lang>`, keyed by the message id),
 * so the lookup goes entity → changes by id, through the unique (kind, eveId)
 * index and the `Change.entityId` index — never a scan.
 *
 * Cached per string for a day, like the other history reads; the page that
 * renders it is ISR and never queried at build time (the history DB is not
 * reachable from CI). Throws on failure — nothing here catches — so an outage
 * fails the render instead of caching a wrong page.
 */
export async function getCachedStringHistory(
  stringId: number,
): Promise<StringHistory | null> {
  "use cache";
  cacheLife("days");

  const collections = await historyDb.collection.findMany({
    where: { name: { startsWith: STRINGS_PREFIX } },
    select: { id: true, name: true },
  });
  const langOf = new Map(
    collections.map((c) => [c.id, c.name.slice(STRINGS_PREFIX.length)]),
  );
  if (langOf.size === 0) return null;

  const entities = await historyDb.entity.findMany({
    where: {
      kind: { in: [...langOf.values()].map((lang) => `string:${lang}`) },
      eveId: stringId,
    },
    select: { id: true },
  });
  if (entities.length === 0) return null;

  const changes = await historyDb.change.findMany({
    where: { entityId: { in: entities.map((e) => e.id) } },
    select: { diffId: true, collectionId: true, op: true, data: true },
  });
  const builds = await readDiffBuilds(changes.map((c) => c.diffId));

  const events = changes.flatMap((c): StringEvent[] => {
    const at = builds.get(c.diffId);
    const lang = langOf.get(c.collectionId);
    if (!at || !lang) return [];
    const { from, to } = (c.data ?? {}) as { from?: string; to?: string };
    return [
      {
        ...at,
        lang,
        op: OP[c.op],
        ...(from === undefined ? {} : { from }),
        ...(to === undefined ? {} : { to }),
      },
    ];
  });
  if (events.length === 0) return null;
  events.sort((a, b) => a.build - b.build || compareLanguages(a.lang, b.lang));

  return {
    stringId,
    languages: [...new Set(events.map((e) => e.lang))].sort(compareLanguages),
    events,
  };
}
