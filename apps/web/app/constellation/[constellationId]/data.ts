import { cacheLife, cacheTag } from "next/cache";

import type { ConstellationIncursions, ConstellationPageData } from "./types";
import { prisma } from "~/lib/db";
import { cacheSdeRead, SDE_CACHE_TAG } from "~/lib/sdeCache";
import {
  readGateNeighbours,
  readIncursionRecords,
  readUniverseSystems,
} from "~/lib/universeData";

/**
 * A constellation, its systems and the constellations its stargates lead to.
 * Returns null for an unknown id, which the page turns into a 404.
 *
 * SDE data only, so it is cached until the next SDE ingest. A failed query
 * throws rather than returning null: a database blip must never be mistaken
 * for a missing constellation and cached as a 404 (see "Never catch a database
 * error inside a `"use cache"` scope" in CLAUDE.md). That is also why this
 * reads with `findUnique` and tests for null.
 */
export async function readConstellation(
  constellationId: number,
): Promise<ConstellationPageData | null> {
  "use cache";
  cacheSdeRead();

  const constellation = await prisma.constellation.findUnique({
    select: {
      name: true,
      regionId: true,
      region: { select: { name: true } },
      factionId: true,
      wormholeClassId: true,
      isDeleted: true,
    },
    where: { constellationId },
  });
  // One ESI no longer lists is gone from EVE, as on the faction page.
  if (!constellation || constellation.isDeleted) return null;

  const [faction, systems] = await Promise.all([
    constellation.factionId === null
      ? null
      : prisma.faction.findUnique({
          select: { factionId: true, name: true },
          where: { factionId: constellation.factionId },
        }),
    readUniverseSystems({ constellationId }),
  ]);

  return {
    constellationId,
    name: constellation.name,
    region: {
      id: constellation.regionId,
      name: constellation.region?.name ?? null,
    },
    faction: faction ? { id: faction.factionId, name: faction.name } : null,
    wormholeClassId: constellation.wormholeClassId,
    systems,
    neighbours: await readGateNeighbours(
      systems.map((system) => system.solarSystemId),
      "constellation",
      constellationId,
    ),
  };
}

/**
 * Every incursion that spawned in the constellation, ours and imported (back to
 * 2015), most recent first. Not SDE data: `esi-track-incursions` writes it every
 * 5 minutes, so it keeps a lifetime of its own. Uncaught, like the
 * constellation read.
 */
export async function readConstellationIncursions(
  constellationId: number,
): Promise<ConstellationIncursions> {
  "use cache";
  // Hours, not the incursions page's minutes: this lifetime is the whole
  // page's, and there are a thousand constellation pages, each regenerating
  // with every query above. An incursion lasts days.
  cacheLife("hours");
  // System names in the tab come from the SDE read; refresh with it too.
  cacheTag(SDE_CACHE_TAG);

  const readAt = new Date();
  return {
    readAt: readAt.toISOString(),
    incursions: await readIncursionRecords([constellationId]),
  };
}
