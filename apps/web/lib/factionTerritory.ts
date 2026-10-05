import type { Prisma } from "~/lib/db";

/**
 * Which faction holds a solar system, as the SDE assigns it.
 *
 * `factionID` is set on a region, overridden on a constellation and overridden
 * again on a system, so a system belongs to the nearest level that names a
 * faction. Only the exceptions carry it on the system itself:
 * `SolarSystem.factionId` is set on 17 of the Caldari State's 423 systems, and
 * New Caldari, its capital, is not one of them. Read `SolarSystem.factionId`
 * alone and most of empire space belongs to nobody.
 */

/** Select this on a solar system to resolve it with {@link systemFactionId}. */
export const systemFactionSelect = {
  factionId: true,
  constellation: {
    select: { factionId: true, region: { select: { factionId: true } } },
  },
} as const;

/** The columns {@link systemFactionSelect} reads. */
export interface SystemFactionColumns {
  factionId: number | null;
  constellation: {
    factionId: number | null;
    region: { factionId: number | null } | null;
  };
}

/** The faction holding a system: its own, else its constellation's, else its region's. */
export function systemFactionId(system: SystemFactionColumns): number | null {
  return (
    system.factionId ??
    system.constellation.factionId ??
    system.constellation.region?.factionId ??
    null
  );
}

/** Filters solar systems to those {@link systemFactionId} gives `factionId`. */
export function factionSolarSystemsWhere(
  factionId: number,
): Prisma.SolarSystemWhereInput {
  return {
    isDeleted: false,
    OR: [
      { factionId },
      { factionId: null, constellation: { factionId } },
      {
        factionId: null,
        constellation: { factionId: null, region: { factionId } },
      },
    ],
  };
}
