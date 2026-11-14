import { prisma } from "~/lib/db";
import { getCachedEntityHistory } from "~/lib/history-entity-page";
import { parsePositiveEntityId } from "~/lib/routeParams";

/**
 * An entity's change history, as JSON, with a label for every id in it, for the
 * History tab of its page. Those pages are cached whole (ISR) and ship without
 * it; the tab fetches this when it opens (`FetchedEntityHistory`).
 *
 * Not read by the pages themselves, because the history database is a separate
 * one and any outage of it failed their renders: a history read that throws or
 * stalls inside an ISR page's background render fails that render, however the
 * page catches it, and under `next start` the request waiting on it got a 500
 * (measured 2026-11 on `/race/[raceId]` and `/type/[typeId]`). Here an outage
 * only fails the tab.
 *
 * Only the kinds a page hosts a History tab for, keyed by the kind the history
 * database stores: every other kind has its own page under `/history`, and an
 * open-ended route would let a crawler mint a cache entry per id of every kind.
 *
 * Each kind with the primary-key lookup its page 404s on (a row marked deleted
 * still has a page), so an id no page exists for is refused before the history
 * read: that read takes seconds on a cold entry, and it would read both
 * databases for a timeline that is always empty.
 */
const HISTORY_TAB_KINDS: Record<string, (id: number) => Promise<unknown>> = {
  type: (typeId) =>
    prisma.type.findUnique({ where: { typeId }, select: { typeId: true } }),
  race: (raceId) =>
    prisma.race.findUnique({ where: { raceId }, select: { raceId: true } }),
  faction: (factionId) =>
    prisma.faction.findUnique({
      where: { factionId },
      select: { factionId: true },
    }),
  npcStation: (stationId) =>
    prisma.station.findUnique({
      where: { stationId },
      select: { stationId: true },
    }),
  constellation: (constellationId) =>
    prisma.constellation.findUnique({
      where: { constellationId },
      select: { constellationId: true },
    }),
  region: (regionId) =>
    prisma.region.findUnique({
      where: { regionId },
      select: { regionId: true },
    }),
  dungeon: (dungeonId) =>
    prisma.dungeon.findUnique({
      where: { dungeonId },
      select: { dungeonId: true },
    }),
  mission: (missionId) =>
    prisma.mission.findUnique({
      where: { missionId },
      select: { missionId: true },
    }),
  epicArc: (epicArcId) =>
    prisma.epicArc.findUnique({
      where: { epicArcId },
      select: { epicArcId: true },
    }),
};

/**
 * Cached at the CDN for an hour; the read under it is the shared
 * `"use cache: remote"` entry, kept a day and refreshed by an SDE ingest.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

/**
 * The refusal of an id no page exists for, cached at the CDN like a history,
 * so a crawler repeating it costs no function. An SDE ingest that adds the
 * entity adds its page too; its tab waits out this hour at most.
 */
const notFound = () =>
  Response.json(
    { error: "No such history tab." },
    { status: 404, headers: { "Cache-Control": CACHE_OK } },
  );

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> },
): Promise<Response> {
  const { entityType, id: raw } = await params;
  const id = parsePositiveEntityId(raw);
  const lookup = Object.hasOwn(HISTORY_TAB_KINDS, entityType)
    ? HISTORY_TAB_KINDS[entityType]
    : undefined;
  if (lookup === undefined || id === null) {
    return Response.json({ error: "No such history tab." }, { status: 404 });
  }

  // A database failure or a stalled read throws: Next answers 500, uncached,
  // and Sentry records it through `onRequestError`. An entity with no recorded
  // change answers a null timeline.
  if ((await lookup(id)) === null) return notFound();
  const history = await getCachedEntityHistory(entityType, id);
  return Response.json(history, { headers: { "Cache-Control": CACHE_OK } });
}
