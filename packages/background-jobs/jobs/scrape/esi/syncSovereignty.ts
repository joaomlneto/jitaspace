import { getSovereigntySystems } from "@jitaspace/esi-client";

import type { JobLogger } from "../../../core";
import { prisma } from "../../../db";
import {
  planSovereigntyUpdates,
  toSovereigntyRow,
} from "../../../helpers/planSovereigntyUpdates.ts";

/**
 * Brings SolarSystemSovereignty in line with ESI's GET /sovereignty/systems
 * (one request; the sovereignty rate-limit group allows 600 per 15 minutes),
 * writing only what changed. Run by `esi-update-alliances` once the Alliance
 * table holds every open alliance, since alliance claims reference it.
 *
 * Returns the alliances that gained or lost a system, for cache eviction.
 */
export async function syncSovereignty({
  knownAllianceIds,
  logger,
}: {
  knownAllianceIds: Set<number>;
  logger: JobLogger;
}) {
  const esiSystems = (await getSovereigntySystems()).data.solar_systems.map(
    toSovereigntyRow,
  );

  const [dbSystems, knownSolarSystems, knownFactions] = await Promise.all([
    prisma.solarSystemSovereignty.findMany({
      omit: { createdAt: true, updatedAt: true },
    }),
    prisma.solarSystem.findMany({
      select: { solarSystemId: true },
      where: {
        solarSystemId: { in: esiSystems.map((row) => row.solarSystemId) },
      },
    }),
    prisma.faction.findMany({ select: { factionId: true } }),
  ]);

  const plan = planSovereigntyUpdates({
    esiSystems,
    dbSystems,
    knownSolarSystemIds: new Set(
      knownSolarSystems.map((system) => system.solarSystemId),
    ),
    knownAllianceIds,
    knownFactionIds: new Set(knownFactions.map((f) => f.factionId)),
  });

  if (plan.skipped.length > 0) {
    logger.warn("Skipped sovereignty claims we cannot store yet", {
      solarSystemIds: plan.skipped.map((row) => row.solarSystemId),
    });
  }

  if (plan.created.length > 0) {
    await prisma.solarSystemSovereignty.createMany({ data: plan.created });
  }
  await Promise.all(
    plan.changed.map(({ solarSystemId, ...data }) =>
      prisma.solarSystemSovereignty.update({ where: { solarSystemId }, data }),
    ),
  );
  if (plan.removedSolarSystemIds.length > 0) {
    await prisma.solarSystemSovereignty.deleteMany({
      where: { solarSystemId: { in: plan.removedSolarSystemIds } },
    });
  }

  return {
    affectedAllianceIds: plan.affectedAllianceIds,
    stats: {
      systems: esiSystems.length,
      allianceHeld: esiSystems.filter((row) => row.allianceId !== null).length,
      added: plan.created.length,
      updated: plan.changed.length,
      removed: plan.removedSolarSystemIds.length,
      skipped: plan.skipped.length,
    },
  };
}
