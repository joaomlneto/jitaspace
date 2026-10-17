import { cacheLife, cacheTag } from "next/cache";

import type { RegionIncursions, RegionPageData } from "./types";
import { prisma } from "~/lib/db";
import { cacheSdeRead, SDE_CACHE_TAG } from "~/lib/sdeCache";
import {
  readGateNeighbours,
  readIncursionRecords,
  readUniverseSystems,
} from "~/lib/universeData";

/**
 * A region, its constellations and systems, and the regions its stargates
 * lead to. Returns null for an unknown id, which the page turns into a 404.
 *
 * SDE data only, so it is cached until the next SDE ingest. A failed query
 * throws rather than returning null: a database blip must never be mistaken
 * for a missing region and cached as a 404 (see "Never catch a database error
 * inside a `"use cache"` scope" in CLAUDE.md).
 */
export async function readRegion(
  regionId: number,
): Promise<RegionPageData | null> {
  "use cache";
  cacheSdeRead();

  const region = await prisma.region.findUnique({
    select: {
      name: true,
      description: true,
      factionId: true,
      wormholeClassId: true,
    },
    where: { regionId },
  });
  if (!region) return null;

  const [faction, constellations] = await Promise.all([
    region.factionId === null
      ? null
      : prisma.faction.findUnique({
          select: { factionId: true, name: true },
          where: { factionId: region.factionId },
        }),
    prisma.constellation.findMany({
      select: { constellationId: true, name: true },
      // Not those ESI no longer lists, which the scraper marks deleted.
      where: { regionId, isDeleted: false },
      orderBy: { name: "asc" },
    }),
  ]);
  const systems = await readUniverseSystems({
    constellationId: { in: constellations.map((c) => c.constellationId) },
  });

  return {
    regionId,
    name: region.name,
    description: region.description,
    faction: faction ? { id: faction.factionId, name: faction.name } : null,
    wormholeClassId: region.wormholeClassId,
    constellations: constellations.map((c) => ({
      id: c.constellationId,
      name: c.name,
    })),
    systems,
    neighbours: await readGateNeighbours(
      systems.map((system) => system.solarSystemId),
      "region",
      regionId,
    ),
  };
}

/**
 * Every incursion that spawned in the region, ours and imported (back to 2015),
 * most recent first. Not SDE data: `esi-track-incursions` writes it every 5
 * minutes, so it keeps a lifetime of its own. Uncaught, like the region
 * read.
 */
export async function readRegionIncursions(
  regionId: number,
): Promise<RegionIncursions> {
  "use cache";
  // Hours, not the incursions page's minutes: this lifetime is the whole
  // page's, and each regeneration re-runs every query above. An incursion
  // lasts days.
  cacheLife("hours");
  // Constellation and system names in the tab come from the SDE read.
  cacheTag(SDE_CACHE_TAG);

  const readAt = new Date();
  const constellations = await prisma.constellation.findMany({
    select: { constellationId: true },
    where: { regionId, isDeleted: false },
  });
  return {
    readAt: readAt.toISOString(),
    incursions: await readIncursionRecords(
      constellations.map((c) => c.constellationId),
    ),
  };
}
