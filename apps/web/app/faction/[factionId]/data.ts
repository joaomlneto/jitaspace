import { cacheLife, cacheTag } from "next/cache";

import type {
  FactionLiveData,
  FactionLocation,
  FactionMissionRow,
  FactionPageData,
  FactionRegionRow,
  FactionSdeData,
  FactionStarbaseCharter,
  FactionTables,
} from "./types";
import { prisma } from "~/lib/db";
import {
  factionSolarSystemsWhere,
  systemFactionId,
} from "~/lib/factionTerritory";
import { stripEveMarkup } from "~/lib/metadata";
import { cacheSdeRead, SDE_CACHE_TAG } from "~/lib/sdeCache";
import { ENLISTED_CORPORATIONS_SHOWN } from "./constants";

/** The columns every location on the page needs: name, security, where. */
const locationSelect = {
  solarSystemId: true,
  name: true,
  securityStatus: true,
  constellationId: true,
  constellation: {
    select: {
      name: true,
      regionId: true,
      region: { select: { name: true } },
    },
  },
} as const;

interface LocationRow {
  solarSystemId: number;
  name: string;
  securityStatus: unknown;
  constellationId: number;
  constellation: {
    name: string;
    regionId: number;
    region: { name: string } | null;
  };
}

function toLocation(system: LocationRow): FactionLocation {
  return {
    solarSystemId: system.solarSystemId,
    name: system.name,
    // Prisma's Decimal; the page only ever needs a plain number.
    securityStatus: Number(system.securityStatus),
    constellationId: system.constellationId,
    constellationName: system.constellation.name,
    regionId: system.constellation.region
      ? system.constellation.regionId
      : null,
    regionName: system.constellation.region?.name ?? null,
  };
}

const byName = <T extends { name: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name);

/** The smaller of two optional numbers; null only when both are. */
const minOfNullable = (a: number | null, b: number | null) => {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
};

/** What a mission asks of the pilot, as far as its SDE row says. */
function missionKind(mission: {
  killDungeonId: number | null;
  courierObjectiveTypeId: number | null;
}): FactionMissionRow["kind"] {
  if (mission.killDungeonId !== null) return "Encounter";
  if (mission.courierObjectiveTypeId !== null) return "Courier";
  return "Other";
}

/**
 * Regions: those the SDE gives to the faction outright, plus every region one
 * of its systems sits in, with how many of its systems and constellations are
 * the faction's.
 */
function buildRegionRows(
  factionRegions: { regionId: number; name: string }[],
  systems: FactionLocation[],
  constellations: { regionId: number }[],
): FactionRegionRow[] {
  const rows = new Map<number, FactionRegionRow>();
  for (const region of factionRegions) {
    rows.set(region.regionId, {
      regionId: region.regionId,
      name: region.name,
      isFactionRegion: true,
      constellations: 0,
      systems: 0,
    });
  }
  for (const system of systems) {
    if (system.regionId === null || system.regionName === null) continue;
    const row = rows.get(system.regionId) ?? {
      regionId: system.regionId,
      name: system.regionName,
      isFactionRegion: false,
      constellations: 0,
      systems: 0,
    };
    row.systems += 1;
    rows.set(system.regionId, row);
  }
  for (const constellation of constellations) {
    const row = rows.get(constellation.regionId);
    if (row) row.constellations += 1;
  }
  return [...rows.values()].sort(
    (a, b) => b.systems - a.systems || a.name.localeCompare(b.name),
  );
}

/**
 * A tower anchored in the faction's space burns its charter. CCP lists one row
 * per tower type, so collapse them to one per charter, at the lowest security
 * any tower needs it.
 */
function collapseCharters(
  resources: { resourceTypeId: number; minSecurityLevel: number | null }[],
  typeNames: Map<number, string>,
): FactionStarbaseCharter[] {
  const charters = new Map<number, FactionStarbaseCharter>();
  for (const resource of resources) {
    charters.set(resource.resourceTypeId, {
      typeId: resource.resourceTypeId,
      name:
        typeNames.get(resource.resourceTypeId) ??
        `Type ${resource.resourceTypeId}`,
      minSecurityLevel: minOfNullable(
        charters.get(resource.resourceTypeId)?.minSecurityLevel ?? null,
        resource.minSecurityLevel,
      ),
    });
  }
  return [...charters.values()].sort(byName);
}

/**
 * What the faction's OpenGraph card needs. Returns null for an unknown or
 * deleted faction; a failure throws, as everywhere on this cached-whole route.
 */
export async function readFactionMetadata(factionId: number) {
  "use cache";
  cacheSdeRead();

  const faction = await prisma.faction.findUnique({
    select: {
      name: true,
      description: true,
      corporationId: true,
      stationCount: true,
      isDeleted: true,
      militiaCorporation: { select: { name: true } },
    },
    where: { factionId },
  });
  return faction && !faction.isDeleted ? faction : null;
}

/**
 * Every piece of static game data about one faction: its identity, races,
 * territory, items, contraband rules, missions, dungeons, skill plans,
 * station standing requirements and starbase charters. Returns null for an
 * unknown faction.
 *
 * One cache entry per faction, kept until the next SDE build is ingested: that
 * is the only time any of it changes. A failure throws rather than degrading
 * here, so a database blip is never mistaken for a missing faction and written
 * into a cached 404.
 */
export async function readFactionSdeData(
  factionId: number,
): Promise<FactionSdeData | null> {
  "use cache";
  cacheSdeRead();

  const faction = await prisma.faction.findUnique({
    select: {
      factionId: true,
      name: true,
      description: true,
      shortDescription: true,
      isUnique: true,
      sizeFactor: true,
      stationCount: true,
      stationSystemCount: true,
      iconId: true,
      isDeleted: true,
      corporationId: true,
      factionCorporation: { select: { name: true } },
      militiaCorporationId: true,
      militiaCorporation: { select: { name: true } },
      solarSystem: { select: locationSelect },
      memberRaces: { select: { raceId: true }, where: { isDeleted: false } },
    },
    where: { factionId },
  });
  // A faction the SDE dropped is soft-deleted by the ingest: gone, not empty.
  if (!faction || faction.isDeleted) return null;

  const [
    races,
    regions,
    constellations,
    systems,
    types,
    contraband,
    missions,
    epicArcs,
    dungeons,
    skillPlans,
    standingRestrictions,
    controlTowerResources,
  ] = await Promise.all([
    prisma.race.findMany({
      select: { raceId: true, name: true, iconId: true, factionId: true },
      where: {
        isDeleted: false,
        OR: [
          { factionId },
          { raceId: { in: faction.memberRaces.map((race) => race.raceId) } },
        ],
      },
    }),
    prisma.region.findMany({
      select: { regionId: true, name: true },
      where: { factionId, isDeleted: false },
    }),
    // Constellations inherit their region's faction the way systems do.
    prisma.constellation.findMany({
      select: { constellationId: true, regionId: true },
      where: {
        isDeleted: false,
        OR: [{ factionId }, { factionId: null, region: { factionId } }],
      },
    }),
    prisma.solarSystem.findMany({
      select: {
        ...locationSelect,
        isHub: true,
        isBorder: true,
        isFringe: true,
        isCorridor: true,
        _count: { select: { stations: { where: { isDeleted: false } } } },
      },
      // The SDE's territory, not just the systems naming the faction.
      where: factionSolarSystemsWhere(factionId),
    }),
    prisma.type.findMany({
      select: {
        typeId: true,
        name: true,
        published: true,
        metaGroupId: true,
        groupId: true,
        group: {
          select: {
            name: true,
            categoryId: true,
            category: { select: { name: true } },
          },
        },
      },
      where: { factionId, isDeleted: false },
    }),
    prisma.contrabandType.findMany({
      select: {
        typeId: true,
        type: { select: { name: true } },
        fineByValue: true,
        standingLoss: true,
        confiscateMinSec: true,
        attackMinSec: true,
      },
      where: { factionId, isDeleted: false },
    }),
    prisma.mission.findMany({
      select: {
        missionId: true,
        name: true,
        killDungeonId: true,
        courierObjectiveTypeId: true,
        rewardTypeId: true,
        rewardQuantity: true,
        hasStandingRewards: true,
      },
      where: { factionId, isDeleted: false },
    }),
    prisma.epicArc.findMany({
      select: {
        epicArcId: true,
        name: true,
        iconId: true,
        _count: { select: { missions: { where: { isDeleted: false } } } },
      },
      where: { factionId, isDeleted: false },
    }),
    prisma.dungeon.findMany({
      select: { dungeonId: true, name: true },
      where: { factionId, isDeleted: false },
    }),
    prisma.skillPlan.findMany({
      select: {
        skillPlanId: true,
        name: true,
        description: true,
        _count: { select: { skills: true } },
      },
      where: { factionId, isDeleted: false },
    }),
    prisma.stationStandingsRestriction.findMany({
      select: { stationServiceId: true, minimumStanding: true },
      where: { factionId, isDeleted: false },
    }),
    prisma.controlTowerResource.findMany({
      select: { resourceTypeId: true, minSecurityLevel: true },
      where: { factionId, isDeleted: false },
    }),
  ]);

  // Names the rows above only carry as ids, resolved in one round trip.
  const metaGroupIds = [...new Set(types.flatMap((t) => t.metaGroupId ?? []))];
  const stationServiceIds = standingRestrictions.map((r) => r.stationServiceId);
  const namedTypeIds = [
    ...new Set([
      ...controlTowerResources.map((r) => r.resourceTypeId),
      ...missions.flatMap((m) => m.rewardTypeId ?? []),
    ]),
  ];
  const [metaGroups, stationServices, namedTypes] = await Promise.all([
    metaGroupIds.length === 0
      ? []
      : prisma.metaGroup.findMany({
          select: { metaGroupId: true, name: true },
          where: { metaGroupId: { in: metaGroupIds } },
        }),
    stationServiceIds.length === 0
      ? []
      : prisma.stationService.findMany({
          select: { stationServiceId: true, name: true },
          where: { stationServiceId: { in: stationServiceIds } },
        }),
    namedTypeIds.length === 0
      ? []
      : prisma.type.findMany({
          select: { typeId: true, name: true },
          where: { typeId: { in: namedTypeIds } },
        }),
  ]);
  const metaGroupNames = new Map(
    metaGroups.map((group) => [group.metaGroupId, group.name]),
  );
  const serviceNames = new Map(
    stationServices.map((service) => [
      service.stationServiceId,
      service.name ?? null,
    ]),
  );
  const typeNames = new Map(namedTypes.map((t) => [t.typeId, t.name]));

  const systemRows = systems.map((system) => ({
    ...toLocation(system),
    stations: system._count.stations,
    isHub: system.isHub ?? false,
    isBorder: system.isBorder ?? false,
    isFringe: system.isFringe ?? false,
    isCorridor: system.isCorridor ?? false,
  }));

  return {
    factionId: faction.factionId,
    name: faction.name,
    description: faction.description,
    shortDescription: faction.shortDescription,
    isUnique: faction.isUnique,
    sizeFactor: faction.sizeFactor,
    stationCount: faction.stationCount,
    stationSystemCount: faction.stationSystemCount,
    iconId: faction.iconId,
    corporation:
      faction.corporationId === null
        ? null
        : {
            id: faction.corporationId,
            name:
              faction.factionCorporation?.name ??
              `Corporation ${faction.corporationId}`,
          },
    militiaCorporation:
      faction.militiaCorporationId === null
        ? null
        : {
            id: faction.militiaCorporationId,
            name:
              faction.militiaCorporation?.name ??
              `Corporation ${faction.militiaCorporationId}`,
          },
    homeSystem: faction.solarSystem ? toLocation(faction.solarSystem) : null,
    races: races
      .map((race) => ({
        raceId: race.raceId,
        name: race.name,
        iconId: race.iconId,
        isHomeRace: race.factionId === factionId,
      }))
      .sort(byName),
    regions: buildRegionRows(regions, systemRows, constellations),
    constellations: constellations.length,
    systems: systemRows.toSorted(byName),
    items: types
      .map((type) => ({
        typeId: type.typeId,
        name: type.name,
        published: type.published,
        groupId: type.groupId,
        groupName: type.group.name,
        categoryId: type.group.categoryId,
        categoryName: type.group.category.name,
        metaGroupName:
          type.metaGroupId === null
            ? null
            : (metaGroupNames.get(type.metaGroupId) ?? null),
      }))
      .sort(byName),
    contraband: contraband
      .map((row) => ({
        typeId: row.typeId,
        name: row.type.name,
        fineByValue: row.fineByValue,
        standingLoss: row.standingLoss,
        confiscateMinSec: row.confiscateMinSec,
        attackMinSec: row.attackMinSec,
      }))
      .sort(byName),
    missions: missions
      .map((mission) => ({
        missionId: mission.missionId,
        name: mission.name,
        kind: missionKind(mission),
        rewardTypeId: mission.rewardTypeId,
        rewardTypeName:
          mission.rewardTypeId === null
            ? null
            : (typeNames.get(mission.rewardTypeId) ?? null),
        rewardQuantity: mission.rewardQuantity,
        hasStandingRewards: mission.hasStandingRewards ?? false,
      }))
      .sort(byName),
    epicArcs: epicArcs
      .map((arc) => ({
        epicArcId: arc.epicArcId,
        name: arc.name,
        iconId: arc.iconId,
        missions: arc._count.missions,
      }))
      .sort(byName),
    dungeons: dungeons
      .map((dungeon) => ({ dungeonId: dungeon.dungeonId, name: dungeon.name }))
      .sort(byName),
    skillPlans: skillPlans
      .map((plan) => ({
        skillPlanId: plan.skillPlanId,
        name: plan.name,
        description: stripEveMarkup(plan.description),
        skills: plan._count.skills,
      }))
      .sort(byName),
    standingRestrictions: standingRestrictions
      .map((restriction) => ({
        stationServiceId: restriction.stationServiceId,
        serviceName: serviceNames.get(restriction.stationServiceId) ?? null,
        minimumStanding: restriction.minimumStanding,
      }))
      .sort((a, b) => a.minimumStanding - b.minimumStanding),
    starbaseCharters: collapseCharters(controlTowerResources, typeNames),
  };
}

/**
 * The faction's NPC corporations, its Faction Warfare enlistment and the
 * systems it holds right now: data the hourly ESI jobs write, not the SDE
 * ingest. Hence its own, shorter lifetime; tagged with the SDE tag as well,
 * since the NPC corporation list itself comes from the SDE.
 *
 * A failure throws, as everywhere on this route: the page is cached whole, so
 * a half degraded to empty would be stored and served for an hour.
 */
export async function readFactionLiveData(
  factionId: number,
  militiaCorporationId: number | null,
): Promise<FactionLiveData> {
  "use cache";
  cacheLife("hours");
  cacheTag(SDE_CACHE_TAG);

  // Player corporations only: NPC militias are enlisted too, and show up among
  // the faction's own corporations. A closed corporation keeps its enlistment
  // with no members (ESI reports it so, and nothing marks it deleted): half of
  // the Caldari militia's 6,851. A militia can still count thousands of live
  // ones, so the page gets totals and the largest few.
  const enlistedWhere = {
    enlistedFactionId: factionId,
    factionId: null,
    memberCount: { gt: 0 },
  };
  const [
    corporations,
    enlistedCorporations,
    enlistedTotals,
    enlistedAlliances,
    sovereignty,
  ] = await Promise.all([
    prisma.corporation.findMany({
      select: {
        corporationId: true,
        name: true,
        ticker: true,
        memberCount: true,
        size: true,
        extent: true,
        _count: {
          select: {
            ownedStations: { where: { isDeleted: false } },
            LoyaltyStoreOffer: { where: { isDeleted: false } },
          },
        },
      },
      where: {
        isDeleted: false,
        OR: [
          { factionId },
          ...(militiaCorporationId === null
            ? []
            : [{ corporationId: militiaCorporationId }]),
        ],
      },
    }),
    prisma.corporation.findMany({
      select: {
        corporationId: true,
        name: true,
        ticker: true,
        memberCount: true,
        allianceId: true,
        alliance: { select: { name: true } },
      },
      where: enlistedWhere,
      orderBy: { memberCount: "desc" },
      take: ENLISTED_CORPORATIONS_SHOWN,
    }),
    prisma.corporation.aggregate({
      where: enlistedWhere,
      _count: { corporationId: true },
      _sum: { memberCount: true },
    }),
    prisma.alliance.findMany({
      select: { allianceId: true, name: true, ticker: true },
      where: { factionId, isDeleted: false },
    }),
    prisma.solarSystemSovereignty.findMany({
      select: {
        solarSystemId: true,
        factionId: true,
        allianceId: true,
        faction: { select: { name: true } },
        alliance: { select: { name: true } },
        solarSystem: {
          select: {
            ...locationSelect,
            factionId: true,
            constellation: {
              select: {
                ...locationSelect.constellation.select,
                factionId: true,
                region: { select: { name: true, factionId: true } },
              },
            },
          },
        },
      },
      where: {
        OR: [
          { factionId },
          { solarSystem: factionSolarSystemsWhere(factionId) },
        ],
      },
    }),
  ]);

  // The systems the SDE gives this faction.
  const homeSystemIds = new Set(
    sovereignty
      .filter((sov) => systemFactionId(sov.solarSystem) === factionId)
      .map((sov) => sov.solarSystemId),
  );

  return {
    corporations: corporations
      .map((corp) => ({
        corporationId: corp.corporationId,
        name: corp.name,
        ticker: corp.ticker,
        memberCount: corp.memberCount,
        size: corp.size,
        extent: corp.extent,
        stations: corp._count.ownedStations,
        lpOffers: corp._count.LoyaltyStoreOffer,
        isMilitia: corp.corporationId === militiaCorporationId,
      }))
      .sort(byName),
    enlistedCorporations: enlistedCorporations
      .map((corp) => ({
        corporationId: corp.corporationId,
        name: corp.name,
        ticker: corp.ticker,
        memberCount: corp.memberCount,
        allianceId: corp.allianceId,
        allianceName: corp.alliance?.name ?? null,
      }))
      .sort((a, b) => b.memberCount - a.memberCount),
    enlistedCorporationCount: enlistedTotals._count.corporationId,
    enlistedPilots: enlistedTotals._sum.memberCount ?? 0,
    enlistedAlliances: enlistedAlliances.toSorted(byName),
    sovereignty: sovereignty
      .filter((sov) => sov.factionId === factionId)
      .map((sov) => ({
        ...toLocation(sov.solarSystem),
        isHomeTerritory: homeSystemIds.has(sov.solarSystemId),
      }))
      .sort(byName),
    lostSystems: sovereignty
      .filter(
        (sov) =>
          sov.factionId !== factionId && homeSystemIds.has(sov.solarSystemId),
      )
      .map((sov) => ({
        ...toLocation(sov.solarSystem),
        occupierFactionId: sov.factionId,
        occupierFactionName: sov.faction?.name ?? null,
        occupierAllianceId: sov.allianceId,
        occupierAllianceName: sov.alliance?.name ?? null,
      }))
      .sort(byName),
  };
}

/**
 * Splits a faction's data into what the page carries and the table rows that
 * `/api/faction/[factionId]` serves when a tab needs them.
 */
export function splitFactionData(
  sde: FactionSdeData,
  live: FactionLiveData,
): { page: FactionPageData; tables: FactionTables } {
  const {
    systems,
    items,
    contraband,
    missions,
    dungeons,
    standingRestrictions,
    ...faction
  } = sde;
  const { corporations, sovereignty, lostSystems, ...rest } = live;
  const tables: FactionTables = {
    systems,
    items,
    contraband,
    missions,
    dungeons,
    standingRestrictions,
    corporations,
    sovereignty,
    lostSystems,
  };
  return {
    page: {
      faction,
      live: rest,
      counts: {
        systems: systems.length,
        items: items.length,
        contraband: contraband.length,
        missions: missions.length,
        dungeons: dungeons.length,
        standingRestrictions: standingRestrictions.length,
        corporations: corporations.length,
        sovereignty: sovereignty.length,
        lostSystems: lostSystems.length,
        territory: new Set([
          ...systems.map((system) => system.solarSystemId),
          ...sovereignty.map((system) => system.solarSystemId),
        ]).size,
      },
    },
    tables,
  };
}
