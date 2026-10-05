import { cacheLife, cacheTag } from "next/cache";

import type {
  CharacterAttribute,
  RaceAgentCount,
  RaceAgentSummary,
  RaceAttributeValues,
  RaceBloodlineRow,
  RaceCategoryCount,
  RaceCorporationRow,
  RaceFactionRow,
  RaceItemRow,
  RaceLocation,
  RacePageData,
  RaceSchoolRow,
  RaceShipClass,
  RaceSkillRow,
  RaceStationRow,
  RaceStationTypeRow,
} from "./types";
import { prisma } from "~/lib/db";
import { cacheSdeRead, SDE_CACHE_TAG } from "~/lib/sdeCache";

const SHIP_CATEGORY_ID = 6;
const SKILL_CATEGORY_ID = 16;

/** A skill's two training attributes and its rank, as dogma attributes. */
const PRIMARY_ATTRIBUTE_ID = 180;
const SECONDARY_ATTRIBUTE_ID = 181;
const SKILL_TIME_CONSTANT_ID = 275;

/** The dogma attribute ids the training attributes above point at. */
const CHARACTER_ATTRIBUTE_BY_DOGMA_ID = new Map<number, CharacterAttribute>([
  [164, "charisma"],
  [165, "intelligence"],
  [166, "memory"],
  [167, "perception"],
  [168, "willpower"],
]);

/** Skill points a rank-1 skill holds at each level; the rank multiplies them. */
const SKILL_POINTS_AT_LEVEL = [0, 250, 1415, 8000, 45255, 256000];

/**
 * NPC corporation ids (`corporationIdRanges` in `@jitaspace/esi-metadata`).
 * Only NPC corporations carry a race, and bounding the query to their range
 * keeps it off the player corporations, which are almost all of the table.
 */
const NPC_CORPORATION_IDS = { gte: 1_000_000, lt: 2_000_000 };

/** Every type the SDE gives this race. `Type.raceId` has no index: a scan. */
const raceTypesWhere = (raceId: number) => ({ raceId, isDeleted: false });

/** NPC corporations of this race, or that let its characters join them. */
const raceCorporationsWhere = (raceId: number) => ({
  isDeleted: false,
  corporationId: NPC_CORPORATION_IDS,
  OR: [{ raceId }, { allowedRaces: { some: { raceId, isDeleted: false } } }],
});

/** Stations ESI attributes to this race, in a known solar system. */
const raceStationsWhere = (raceId: number) => ({
  raceId,
  isDeleted: false,
  solarSystemId: { not: null },
});

/** The columns every location on the page needs: name, security, region. */
const locationSelect = {
  solarSystemId: true,
  name: true,
  securityStatus: true,
  constellation: {
    select: { regionId: true, region: { select: { name: true } } },
  },
} as const;

interface LocationRow {
  solarSystemId: number;
  name: string;
  securityStatus: unknown;
  constellation: { regionId: number; region: { name: string } | null };
}

function toLocation(system: LocationRow): RaceLocation {
  return {
    solarSystemId: system.solarSystemId,
    name: system.name,
    // Prisma's Decimal; the page only ever needs a plain number.
    securityStatus: Number(system.securityStatus),
    regionId: system.constellation.region
      ? system.constellation.regionId
      : null,
    regionName: system.constellation.region?.name ?? null,
  };
}

const byName = <T extends { name: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name);

/** Most first, then by name. */
const byCountDesc = <T extends { name: string; count: number }>(a: T, b: T) =>
  b.count - a.count || a.name.localeCompare(b.name);

/** The SDE omits an attribute it gives no points; those read as 0. */
function attributeValues(
  row: Record<CharacterAttribute, number | null>,
): RaceAttributeValues {
  return {
    intelligence: row.intelligence ?? 0,
    perception: row.perception ?? 0,
    charisma: row.charisma ?? 0,
    willpower: row.willpower ?? 0,
    memory: row.memory ?? 0,
  };
}

const attributeSelect = {
  charisma: true,
  intelligence: true,
  memory: true,
  perception: true,
  willpower: true,
} as const;

/** A named entity from an id, with the id as the name when the row is gone. */
function named(
  id: number | null,
  names: Map<number, string>,
  kind: string,
): { id: number; name: string } | null {
  if (id === null) return null;
  return { id, name: names.get(id) ?? `${kind} ${id}` };
}

/** The median of a list, or null for an empty one. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? null)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

interface RaceTypeRecord extends RaceItemRow {
  mass: number | null;
}

/**
 * Every item the SDE gives the race, with its group, category and meta group.
 * One cache entry per race, shared by the page (which counts and sorts it) and
 * the items table route (which sends it whole).
 */
async function readRaceTypes(raceId: number): Promise<RaceTypeRecord[]> {
  "use cache";
  cacheSdeRead();

  const types = await prisma.type.findMany({
    select: {
      typeId: true,
      name: true,
      published: true,
      groupId: true,
      metaGroupId: true,
      techLevel: true,
      mass: true,
      group: {
        select: {
          name: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      },
    },
    where: raceTypesWhere(raceId),
  });

  const metaGroupIds = [...new Set(types.flatMap((t) => t.metaGroupId ?? []))];
  const metaGroups =
    metaGroupIds.length === 0
      ? []
      : await prisma.metaGroup.findMany({
          select: { metaGroupId: true, name: true },
          where: { metaGroupId: { in: metaGroupIds } },
        });
  const metaGroupNames = new Map(
    metaGroups.map((group) => [group.metaGroupId, group.name]),
  );

  return types
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
      techLevel: type.techLevel,
      mass: type.mass,
    }))
    .sort(byName);
}

/**
 * The race's published hulls by class. Classes are ordered by their hulls'
 * median mass, which puts them in the order players think of them: frigates
 * and destroyers, cruisers, battleships, then capitals.
 */
function buildShipClasses(types: RaceTypeRecord[]): RaceShipClass[] {
  const classes = new Map<
    number,
    { groupId: number; name: string; ships: RaceTypeRecord[] }
  >();
  for (const type of types) {
    if (type.categoryId !== SHIP_CATEGORY_ID || !type.published) continue;
    const shipClass = classes.get(type.groupId) ?? {
      groupId: type.groupId,
      name: type.groupName,
      ships: [],
    };
    shipClass.ships.push(type);
    classes.set(type.groupId, shipClass);
  }
  return [...classes.values()]
    .map((shipClass) => ({
      shipClass,
      mass: median(shipClass.ships.flatMap((ship) => ship.mass ?? [])),
    }))
    .sort(
      (a, b) =>
        (a.mass ?? Infinity) - (b.mass ?? Infinity) ||
        a.shipClass.name.localeCompare(b.shipClass.name),
    )
    .map(({ shipClass }) => ({
      groupId: shipClass.groupId,
      name: shipClass.name,
      ships: shipClass.ships.map((ship) => ({
        typeId: ship.typeId,
        name: ship.name,
        metaGroupName: ship.metaGroupName,
      })),
    }));
}

function countCategories(types: RaceTypeRecord[]): RaceCategoryCount[] {
  const categories = new Map<number, RaceCategoryCount>();
  for (const type of types) {
    const category = categories.get(type.categoryId) ?? {
      categoryId: type.categoryId,
      name: type.categoryName,
      total: 0,
      published: 0,
    };
    category.total += 1;
    if (type.published) category.published += 1;
    categories.set(type.categoryId, category);
  }
  return [...categories.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  );
}

function summarizeAgents(
  groups: {
    level: number;
    agentDivisionId: number;
    agentTypeId: number;
    isLocator: boolean;
    _count: { _all: number };
  }[],
  divisionNames: Map<number, string>,
  agentTypeNames: Map<number, string>,
): RaceAgentSummary {
  const levels = new Map<number, number>();
  const divisions = new Map<number, number>();
  const agentTypes = new Map<number, number>();
  let total = 0;
  let locators = 0;
  for (const group of groups) {
    const count = group._count._all;
    total += count;
    if (group.isLocator) locators += count;
    levels.set(group.level, (levels.get(group.level) ?? 0) + count);
    divisions.set(
      group.agentDivisionId,
      (divisions.get(group.agentDivisionId) ?? 0) + count,
    );
    agentTypes.set(
      group.agentTypeId,
      (agentTypes.get(group.agentTypeId) ?? 0) + count,
    );
  }
  const counted = (
    counts: Map<number, number>,
    names: Map<number, string>,
    kind: string,
  ): RaceAgentCount[] =>
    [...counts]
      .map(([id, count]) => ({
        id,
        name: names.get(id) ?? `${kind} ${id}`,
        count,
      }))
      .sort(byCountDesc);
  return {
    total,
    locators,
    byLevel: [...levels]
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level - b.level),
    byDivision: counted(divisions, divisionNames, "Division"),
    byType: counted(agentTypes, agentTypeNames, "Agent type"),
  };
}

/** Runs a lookup by ids only when there are any: `in: []` is a wasted query. */
function whenAny<T>(
  ids: readonly unknown[],
  read: () => Promise<T[]>,
): Promise<T[]> {
  return ids.length === 0 ? Promise.resolve([]) : read();
}

/** An optional reference with its name, or the id when the row is gone. */
function namedOrNull(
  id: number | null,
  name: string | undefined,
  kind: string,
): { id: number; name: string } | null {
  return id === null ? null : { id, name: name ?? `${kind} ${id}` };
}

/** By group, then by name: how the game lists skills. */
const bySkillGroup = <T extends { groupName: string; name: string }>(
  a: T,
  b: T,
) => a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name);

/** Skill points at a level, from the skill's rank; null without a rank. */
function skillPointsAt(level: number, rank: number | null): number | null {
  if (rank === null) return null;
  return Math.round((SKILL_POINTS_AT_LEVEL[level] ?? 0) * rank);
}

/**
 * Builds a skill's row from the names and dogma attributes read for it: its
 * group, rank and the two attributes it trains from.
 */
function skillRowBuilder(
  types: {
    typeId: number;
    name: string;
    published: boolean;
    groupId: number;
    group: { name: string };
  }[],
  attributes: { typeId: number; attributeId: number; value: number }[],
): (typeId: number) => RaceSkillRow {
  const typesById = new Map(types.map((type) => [type.typeId, type]));
  const attributesBySkill = new Map<number, Map<number, number>>();
  for (const row of attributes) {
    const skillAttributes =
      attributesBySkill.get(row.typeId) ?? new Map<number, number>();
    skillAttributes.set(row.attributeId, row.value);
    attributesBySkill.set(row.typeId, skillAttributes);
  }
  return (typeId) => {
    const type = typesById.get(typeId);
    const skillAttributes = attributesBySkill.get(typeId);
    const trainingAttribute = (attributeId: number) => {
      const value = skillAttributes?.get(attributeId);
      return value === undefined
        ? null
        : (CHARACTER_ATTRIBUTE_BY_DOGMA_ID.get(value) ?? null);
    };
    return {
      typeId,
      name: type?.name ?? `Type ${typeId}`,
      groupId: type?.groupId ?? 0,
      groupName: type?.group.name ?? "Unknown",
      published: type?.published ?? false,
      rank: skillAttributes?.get(SKILL_TIME_CONSTANT_ID) ?? null,
      primaryAttribute: trainingAttribute(PRIMARY_ATTRIBUTE_ID),
      secondaryAttribute: trainingAttribute(SECONDARY_ATTRIBUTE_ID),
    };
  };
}

/** Station types the race builds, with the operations that use each. */
function buildStationTypeRows(
  stationTypes: {
    stationTypeId: number;
    stationOperation: { operationName: string };
  }[],
  typeNames: Map<number, string>,
): RaceStationTypeRow[] {
  const operationsByStationType = new Map<number, Set<string>>();
  for (const row of stationTypes) {
    const operations =
      operationsByStationType.get(row.stationTypeId) ?? new Set<string>();
    operations.add(row.stationOperation.operationName);
    operationsByStationType.set(row.stationTypeId, operations);
  }
  return [...operationsByStationType]
    .map(([typeId, operations]) => ({
      typeId,
      name: typeNames.get(typeId) ?? `Type ${typeId}`,
      operations: [...operations].sort((a, b) => a.localeCompare(b)),
    }))
    .sort(
      (a, b) =>
        b.operations.length - a.operations.length ||
        a.name.localeCompare(b.name),
    );
}

/**
 * The factions that list the race as a member, plus its home faction when
 * none of them is it. The home faction first, then the others by name.
 */
function buildFactionRows(
  home: { id: number; name: string } | null,
  members: { factionId: number; faction: { name: string } }[],
): RaceFactionRow[] {
  const factions = new Map(
    members.map((member) => [
      member.factionId,
      {
        factionId: member.factionId,
        name: member.faction.name,
        isHomeFaction: member.factionId === home?.id,
        isMemberRace: true,
      },
    ]),
  );
  if (home && !factions.has(home.id)) {
    factions.set(home.id, {
      factionId: home.id,
      name: home.name,
      isHomeFaction: true,
      isMemberRace: false,
    });
  }
  return [...factions.values()].sort(
    (a, b) =>
      Number(b.isHomeFaction) - Number(a.isHomeFaction) ||
      a.name.localeCompare(b.name),
  );
}

type AttributeColumns = Record<CharacterAttribute, number | null>;

function buildBloodlineRows(
  bloodlines: (AttributeColumns & {
    bloodlineId: number;
    name: string;
    description: string;
    iconId: number | null;
    corporationId: number;
    corporation: { name: string };
    shipTypeId: number | null;
    shipType: { name: string } | null;
    ancestries: (AttributeColumns & {
      ancestryId: number;
      name: string;
      shortDescription: string | null;
      description: string;
      iconId: number | null;
    })[];
  })[],
): RaceBloodlineRow[] {
  return bloodlines
    .map((bloodline) => ({
      bloodlineId: bloodline.bloodlineId,
      name: bloodline.name,
      description: bloodline.description,
      iconId: bloodline.iconId,
      corporation: {
        id: bloodline.corporationId,
        name: bloodline.corporation.name,
      },
      shipType: namedOrNull(
        bloodline.shipTypeId,
        bloodline.shipType?.name,
        "Type",
      ),
      attributes: attributeValues(bloodline),
      ancestries: bloodline.ancestries
        .map((ancestry) => ({
          ancestryId: ancestry.ancestryId,
          name: ancestry.name,
          shortDescription: ancestry.shortDescription,
          description: ancestry.description,
          iconId: ancestry.iconId,
          bonuses: attributeValues(ancestry),
        }))
        .sort((a, b) => a.ancestryId - b.ancestryId),
    }))
    .sort((a, b) => a.bloodlineId - b.bloodlineId);
}

/** The names and places a race's schools carry only as ids. */
interface SchoolLookups {
  systemBySchool: Map<number, number>;
  systems: Map<number, RaceLocation>;
  stations: Map<number, { name: string; solarSystem: LocationRow | null }>;
  corporationNames: Map<number, string>;
  agentNames: Map<number, string>;
}

/** The race's schools, the originals first, each before its Starter Space copy. */
function buildSchoolRows(
  schools: {
    schoolId: number;
    name: string;
    title: string | null;
    description: string | null;
    characterDescription: string | null;
    iconId: number | null;
    corporationId: number;
    isStarterSpaceSchool: boolean | null;
    careerAgents: { agentId: number }[];
    startingStations: { stationId: number }[];
  }[],
  lookups: SchoolLookups,
): RaceSchoolRow[] {
  return schools
    .map((school) => {
      const homeSystemId = lookups.systemBySchool.get(school.schoolId);
      return {
        schoolId: school.schoolId,
        name: school.name,
        title: school.title,
        description: school.description,
        characterDescription: school.characterDescription,
        iconId: school.iconId,
        corporation: named(
          school.corporationId,
          lookups.corporationNames,
          "Corporation",
        ),
        isStarterSpaceSchool: school.isStarterSpaceSchool ?? false,
        homeSystem:
          homeSystemId === undefined
            ? null
            : (lookups.systems.get(homeSystemId) ?? null),
        startingStations: school.startingStations
          .flatMap(({ stationId }) => {
            const station = lookups.stations.get(stationId);
            if (!station?.solarSystem) return [];
            return [
              {
                ...toLocation(station.solarSystem),
                stationId,
                stationName: station.name,
              },
            ];
          })
          .sort((a, b) => a.stationName.localeCompare(b.stationName)),
        careerAgents: school.careerAgents
          .flatMap(
            ({ agentId }) => named(agentId, lookups.agentNames, "Agent") ?? [],
          )
          .sort(byName),
      };
    })
    .sort(
      (a, b) =>
        Number(a.isStarterSpaceSchool) - Number(b.isStarterSpaceSchool) ||
        a.schoolId - b.schoolId,
    );
}

/**
 * What the race's OpenGraph card needs. Returns null for an unknown or deleted
 * race; a failure throws, as everywhere on this cached-whole route.
 */
export async function readRaceMetadata(raceId: number) {
  "use cache";
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);

  const race = await prisma.race.findUnique({
    select: {
      name: true,
      description: true,
      shipTypeId: true,
      isDeleted: true,
      faction: { select: { name: true } },
      _count: { select: { bloodlines: { where: { isDeleted: false } } } },
    },
    where: { raceId },
  });
  return race && !race.isDeleted ? race : null;
}

/**
 * Everything the race page carries: its identity and faction, bloodlines and
 * their ancestries, schools, starting and Alpha clone skills, racial skills,
 * ships by class, items by category, station architecture and NPC agents, plus
 * the row counts of the tables the page fetches separately. Returns null for
 * an unknown race.
 *
 * Nearly all of it is SDE data, but the race's faction, its bloodlines'
 * corvettes and which stations are the race's come from the ESI scrapes. So
 * the entry lives for a day, not until the next SDE ingest, and carries the
 * SDE tag so an ingest refreshes it too. A failure throws rather than
 * degrading, so a database blip is never written into a cached 404.
 */
export async function readRaceData(
  raceId: number,
): Promise<RacePageData | null> {
  "use cache";
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);

  const race = await prisma.race.findUnique({
    select: {
      raceId: true,
      name: true,
      description: true,
      iconId: true,
      isDeleted: true,
      factionId: true,
      faction: { select: { name: true } },
      shipTypeId: true,
      shipType: { select: { name: true } },
    },
    where: { raceId },
  });
  // A race the SDE dropped is soft-deleted by the ingest: gone, not empty.
  if (!race || race.isDeleted) return null;

  const [
    types,
    bloodlines,
    memberFactions,
    schools,
    schoolMaps,
    startingSkills,
    cloneGrade,
    stationTypes,
    agentGroups,
    corporations,
    stations,
  ] = await Promise.all([
    readRaceTypes(raceId),
    prisma.bloodline.findMany({
      select: {
        bloodlineId: true,
        name: true,
        description: true,
        iconId: true,
        ...attributeSelect,
        corporationId: true,
        corporation: { select: { name: true } },
        shipTypeId: true,
        shipType: { select: { name: true } },
        ancestries: {
          select: {
            ancestryId: true,
            name: true,
            shortDescription: true,
            description: true,
            iconId: true,
            ...attributeSelect,
          },
          where: { isDeleted: false },
        },
      },
      where: { raceId, isDeleted: false },
    }),
    prisma.factionMemberRace.findMany({
      select: { factionId: true, faction: { select: { name: true } } },
      where: { raceId, isDeleted: false, faction: { isDeleted: false } },
    }),
    prisma.school.findMany({
      select: {
        schoolId: true,
        name: true,
        title: true,
        description: true,
        characterDescription: true,
        iconId: true,
        corporationId: true,
        isStarterSpaceSchool: true,
        careerAgents: {
          select: { agentId: true },
          where: { isDeleted: false },
        },
        startingStations: {
          select: { stationId: true },
          where: { isDeleted: false },
        },
      },
      where: { raceId, isDeleted: false },
    }),
    // A dozen rows in all; filtered to this race's schools below.
    prisma.schoolMap.findMany({
      select: { schoolId: true, solarSystemId: true },
      where: { isDeleted: false },
    }),
    prisma.raceSkill.findMany({
      select: { skillTypeId: true, level: true },
      where: { raceId, isDeleted: false },
    }),
    // CCP keys the four Alpha clone grades by their race's id: 1 is "Alpha
    // Caldari", 2 "Alpha Minmatar", 4 "Alpha Amarr", 8 "Alpha Gallente".
    prisma.cloneGrade.findUnique({
      select: {
        cloneGradeId: true,
        name: true,
        isDeleted: true,
        skills: {
          select: { skillTypeId: true, level: true },
          where: { isDeleted: false },
        },
      },
      where: { cloneGradeId: raceId },
    }),
    prisma.stationOperationStationType.findMany({
      select: {
        stationTypeId: true,
        stationOperation: { select: { operationName: true } },
      },
      where: {
        raceId,
        isDeleted: false,
        stationOperation: { isDeleted: false },
      },
    }),
    prisma.agent.groupBy({
      by: ["level", "agentDivisionId", "agentTypeId", "isLocator"],
      where: { isDeleted: false, Character: { raceId } },
      _count: { _all: true },
    }),
    prisma.corporation.count({ where: raceCorporationsWhere(raceId) }),
    prisma.station.count({ where: raceStationsWhere(raceId) }),
  ]);

  const grade = cloneGrade && !cloneGrade.isDeleted ? cloneGrade : null;
  const racialSkillIds = types
    .filter((type) => type.categoryId === SKILL_CATEGORY_ID && type.published)
    .map((type) => type.typeId);
  const skillIds = [
    ...new Set([
      ...startingSkills.map((skill) => skill.skillTypeId),
      ...(grade?.skills ?? []).map((skill) => skill.skillTypeId),
      ...racialSkillIds,
    ]),
  ];
  const stationTypeIds = [
    ...new Set(stationTypes.map((row) => row.stationTypeId)),
  ];
  const namedTypeIds = [...new Set([...skillIds, ...stationTypeIds])];
  const schoolMapBySchool = new Map(
    schoolMaps.map((row) => [row.schoolId, row.solarSystemId]),
  );
  const schoolSystemIds = [
    ...new Set(
      schools.flatMap((school) => schoolMapBySchool.get(school.schoolId) ?? []),
    ),
  ];
  const schoolStationIds = [
    ...new Set(
      schools.flatMap((school) =>
        school.startingStations.map((station) => station.stationId),
      ),
    ),
  ];
  const careerAgentIds = [
    ...new Set(
      schools.flatMap((school) =>
        school.careerAgents.map((agent) => agent.agentId),
      ),
    ),
  ];
  const schoolCorporationIds = [
    ...new Set(schools.map((school) => school.corporationId)),
  ];
  const divisionIds = [...new Set(agentGroups.map((g) => g.agentDivisionId))];
  const agentTypeIds = [...new Set(agentGroups.map((g) => g.agentTypeId))];

  // Names and details the rows above only carry as ids, in one round trip.
  const [
    namedTypes,
    skillAttributes,
    schoolCorporations,
    schoolStations,
    careerAgents,
    schoolSystems,
    divisions,
    agentTypes,
  ] = await Promise.all([
    whenAny(namedTypeIds, () =>
      prisma.type.findMany({
        select: {
          typeId: true,
          name: true,
          published: true,
          groupId: true,
          group: { select: { name: true } },
        },
        where: { typeId: { in: namedTypeIds } },
      }),
    ),
    whenAny(skillIds, () =>
      prisma.typeAttribute.findMany({
        select: { typeId: true, attributeId: true, value: true },
        where: {
          typeId: { in: skillIds },
          attributeId: {
            in: [
              PRIMARY_ATTRIBUTE_ID,
              SECONDARY_ATTRIBUTE_ID,
              SKILL_TIME_CONSTANT_ID,
            ],
          },
          isDeleted: false,
        },
      }),
    ),
    whenAny(schoolCorporationIds, () =>
      prisma.corporation.findMany({
        select: { corporationId: true, name: true },
        where: { corporationId: { in: schoolCorporationIds } },
      }),
    ),
    whenAny(schoolStationIds, () =>
      prisma.station.findMany({
        select: {
          stationId: true,
          name: true,
          solarSystem: { select: locationSelect },
        },
        where: { stationId: { in: schoolStationIds } },
      }),
    ),
    whenAny(careerAgentIds, () =>
      prisma.character.findMany({
        select: { characterId: true, name: true },
        where: { characterId: { in: careerAgentIds } },
      }),
    ),
    whenAny(schoolSystemIds, () =>
      prisma.solarSystem.findMany({
        select: locationSelect,
        where: { solarSystemId: { in: schoolSystemIds } },
      }),
    ),
    whenAny(divisionIds, () =>
      prisma.npcCorporationDivision.findMany({
        select: {
          npcCorporationDivisionId: true,
          name: true,
          displayName: true,
        },
        where: { npcCorporationDivisionId: { in: divisionIds } },
      }),
    ),
    whenAny(agentTypeIds, () =>
      prisma.agentType.findMany({
        select: { agentTypeId: true, name: true },
        where: { agentTypeId: { in: agentTypeIds } },
      }),
    ),
  ]);

  const skillRow = skillRowBuilder(namedTypes, skillAttributes);
  const faction = namedOrNull(race.factionId, race.faction?.name, "Faction");

  return {
    raceId: race.raceId,
    name: race.name,
    description: race.description ?? "",
    iconId: race.iconId,
    faction,
    starterShip: namedOrNull(race.shipTypeId, race.shipType?.name, "Type"),
    factions: buildFactionRows(faction, memberFactions),
    bloodlines: buildBloodlineRows(bloodlines),
    schools: buildSchoolRows(schools, {
      systemBySchool: schoolMapBySchool,
      systems: new Map(
        schoolSystems.map((system) => [
          system.solarSystemId,
          toLocation(system),
        ]),
      ),
      stations: new Map(
        schoolStations.map((station) => [station.stationId, station]),
      ),
      corporationNames: new Map(
        schoolCorporations.map((corp) => [corp.corporationId, corp.name]),
      ),
      agentNames: new Map(
        careerAgents.map((agent) => [agent.characterId, agent.name]),
      ),
    }),
    startingSkills: startingSkills
      .map((skill) => {
        const row = skillRow(skill.skillTypeId);
        return {
          ...row,
          level: skill.level,
          skillPoints: skillPointsAt(skill.level, row.rank),
        };
      })
      .sort(bySkillGroup),
    cloneGrade: grade && {
      cloneGradeId: grade.cloneGradeId,
      name: grade.name,
      skills: grade.skills
        .map((skill) => ({
          ...skillRow(skill.skillTypeId),
          maxLevel: skill.level,
        }))
        .sort(bySkillGroup),
    },
    racialSkills: racialSkillIds.map(skillRow).sort(bySkillGroup),
    shipClasses: buildShipClasses(types),
    itemCategories: countCategories(types),
    stationTypes: buildStationTypeRows(
      stationTypes,
      new Map(namedTypes.map((type) => [type.typeId, type.name])),
    ),
    agents: summarizeAgents(
      agentGroups,
      new Map(
        divisions.map((division) => [
          division.npcCorporationDivisionId,
          division.displayName ?? division.name,
        ]),
      ),
      new Map(agentTypes.map((type) => [type.agentTypeId, type.name])),
    ),
    counts: {
      items: types.length,
      corporations,
      stations,
    },
  };
}

/** Every item the SDE gives the race, for the items table. */
export async function readRaceItems(raceId: number): Promise<RaceItemRow[]> {
  const types = await readRaceTypes(raceId);
  return types.map((type) => ({
    typeId: type.typeId,
    name: type.name,
    published: type.published,
    groupId: type.groupId,
    groupName: type.groupName,
    categoryId: type.categoryId,
    categoryName: type.categoryName,
    metaGroupName: type.metaGroupName,
    techLevel: type.techLevel,
  }));
}

/**
 * The race's NPC corporations, and those that let its characters join. Member
 * counts come from the hourly ESI job, hence the hourly lifetime; tagged with
 * the SDE tag too, since the corporations and their races come from the SDE.
 */
export async function readRaceCorporations(
  raceId: number,
): Promise<RaceCorporationRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(SDE_CACHE_TAG);

  const corporations = await prisma.corporation.findMany({
    select: {
      corporationId: true,
      name: true,
      ticker: true,
      memberCount: true,
      raceId: true,
      factionId: true,
      faction: { select: { name: true } },
      size: true,
      extent: true,
      allowedRaces: {
        select: { raceId: true },
        where: { raceId, isDeleted: false },
      },
      _count: {
        select: {
          ownedStations: { where: { isDeleted: false } },
          LoyaltyStoreOffer: { where: { isDeleted: false } },
        },
      },
    },
    where: raceCorporationsWhere(raceId),
  });

  return corporations
    .map((corp) => ({
      corporationId: corp.corporationId,
      name: corp.name,
      ticker: corp.ticker,
      memberCount: corp.memberCount,
      factionId: corp.factionId,
      factionName: corp.faction?.name ?? null,
      size: corp.size,
      extent: corp.extent,
      stations: corp._count.ownedStations,
      lpOffers: corp._count.LoyaltyStoreOffer,
      isRaceCorporation: corp.raceId === raceId,
      acceptsRace: corp.allowedRaces.length > 0,
    }))
    .sort(byName);
}

/**
 * The stations ESI attributes to the race, with where they are and who owns
 * them. The race comes from the ESI station scrape, hence a day rather than
 * the SDE's lifetime.
 */
export async function readRaceStations(
  raceId: number,
): Promise<RaceStationRow[]> {
  "use cache";
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);

  const stations = await prisma.station.findMany({
    select: {
      stationId: true,
      name: true,
      typeId: true,
      stationType: { select: { name: true } },
      ownerId: true,
      owner: { select: { name: true } },
      solarSystem: { select: locationSelect },
    },
    where: raceStationsWhere(raceId),
  });

  return stations
    .flatMap((station) =>
      station.solarSystem
        ? [
            {
              ...toLocation(station.solarSystem),
              stationId: station.stationId,
              stationName: station.name,
              typeId: station.typeId,
              typeName: station.stationType.name,
              ownerId: station.ownerId,
              ownerName: station.owner?.name ?? null,
            },
          ]
        : [],
    )
    .sort((a, b) => a.stationName.localeCompare(b.stationName));
}
