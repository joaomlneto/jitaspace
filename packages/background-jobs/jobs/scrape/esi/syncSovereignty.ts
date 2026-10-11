import type { SovereigntySystemsSolarsystem } from "@jitaspace/esi-client";

import type { JobLogger } from "../../../core";
import { prisma } from "../../../db";
import {
  planSovereigntyUpdates,
  toSovereigntyRow,
} from "../../../helpers/planSovereigntyUpdates.ts";
import { MIN_LISTED_SHARE } from "../../../helpers/sovereigntyHistory.ts";

/**
 * Brings SolarSystemSovereignty in line with one response of ESI's GET
 * /sovereignty/systems, writing only what changed. Run by
 * `esi-track-sovereignty` every 5 minutes.
 *
 * An alliance claim is only written once `esi-update-alliances` (hourly) has
 * added the alliance to the Alliance table, which it references; until then
 * it is skipped and logged.
 *
 * Returns the alliances that gained or lost a system, for cache eviction.
 */
export async function syncSovereignty({
  solarSystems,
  logger,
}: {
  solarSystems: SovereigntySystemsSolarsystem[];
  logger: JobLogger;
}) {
  const esiSystems = solarSystems.map(toSovereigntyRow);
  const claimingAllianceIds = [
    ...new Set(esiSystems.flatMap((row) => row.allianceId ?? [])),
  ];

  const [dbSystems, knownSolarSystems, knownFactions, knownAlliances] =
    await Promise.all([
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
      prisma.alliance.findMany({
        select: { allianceId: true },
        where: { allianceId: { in: claimingAllianceIds } },
      }),
    ]);

  // A partial response would delete every system it missed, and evict their
  // holders' pages, until the next poll put them back.
  if (esiSystems.length < dbSystems.length * MIN_LISTED_SHARE) {
    logger.warn("ESI listed too few systems; ignored it as a failed response", {
      systems: esiSystems.length,
      stored: dbSystems.length,
    });
    return {
      affectedAllianceIds: [],
      stats: {
        systems: esiSystems.length,
        allianceHeld: 0,
        added: 0,
        updated: 0,
        removed: 0,
        skipped: esiSystems.length,
      },
    };
  }

  const plan = planSovereigntyUpdates({
    esiSystems,
    dbSystems,
    knownSolarSystemIds: new Set(
      knownSolarSystems.map((system) => system.solarSystemId),
    ),
    knownAllianceIds: new Set(knownAlliances.map((a) => a.allianceId)),
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
