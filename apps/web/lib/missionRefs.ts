import { prisma } from "~/lib/db";

/**
 * Batched name lookups shared by the mission and dungeon routes.
 *
 * The mission tables hold plain integer ids rather than relations (see the
 * comment above `Mission` in schema.prisma), so each page resolves what they
 * point at in one query per entity kind. Call these from inside a
 * `"use cache"` scope, and let them throw: a caught failure there would be
 * stored as an empty page.
 */

export interface TypeRef {
  typeId: number;
  name: string | null;
  groupId: number | null;
  groupName: string | null;
}

export interface FactionRef {
  factionId: number;
  name: string | null;
}

export interface CorporationRef {
  corporationId: number;
  name: string | null;
  factionId: number | null;
}

export interface AgentRef {
  characterId: number;
  name: string | null;
  level: number | null;
  agentTypeName: string | null;
  divisionName: string | null;
  corporationId: number | null;
  corporationName: string | null;
  stationId: number | null;
  stationName: string | null;
  solarSystemId: number | null;
  solarSystemName: string | null;
  constellationId: number | null;
  constellationName: string | null;
  regionId: number | null;
  regionName: string | null;
}

/** A dungeon id, with what dungeons.yaml says about it when it says anything. */
export interface DungeonRef {
  dungeonId: number;
  /** Null when the dungeon is not in dungeons.yaml (most mission dungeons). */
  name: string | null;
  archetypeId: number | null;
  archetypeTitle: string | null;
  factionId: number | null;
}

const unique = (ids: readonly (number | null | undefined)[]): number[] => [
  ...new Set(ids.filter((id): id is number => id != null)),
];

export async function readTypeRefs(
  ids: readonly (number | null | undefined)[],
): Promise<Map<number, TypeRef>> {
  const typeIds = unique(ids);
  if (typeIds.length === 0) return new Map();
  const rows = await prisma.type.findMany({
    select: {
      typeId: true,
      name: true,
      groupId: true,
      group: { select: { name: true } },
    },
    where: { typeId: { in: typeIds } },
  });
  const found = new Map(rows.map((row) => [row.typeId, row]));
  // An id with no row still gets an entry, so the page can show the bare id.
  return new Map(
    typeIds.map((typeId) => {
      const row = found.get(typeId);
      return [
        typeId,
        {
          typeId,
          name: row?.name ?? null,
          groupId: row?.groupId ?? null,
          groupName: row?.group.name ?? null,
        },
      ];
    }),
  );
}

export async function readFactionRefs(
  ids: readonly (number | null | undefined)[],
): Promise<Map<number, FactionRef>> {
  const factionIds = unique(ids);
  if (factionIds.length === 0) return new Map();
  const rows = await prisma.faction.findMany({
    select: { factionId: true, name: true },
    where: { factionId: { in: factionIds } },
  });
  const names = new Map(rows.map((row) => [row.factionId, row.name]));
  return new Map(
    factionIds.map((factionId) => [
      factionId,
      { factionId, name: names.get(factionId) ?? null },
    ]),
  );
}

export async function readCorporationRefs(
  ids: readonly (number | null | undefined)[],
): Promise<Map<number, CorporationRef>> {
  const corporationIds = unique(ids);
  if (corporationIds.length === 0) return new Map();
  const rows = await prisma.corporation.findMany({
    select: { corporationId: true, name: true, factionId: true },
    where: { corporationId: { in: corporationIds } },
  });
  const found = new Map(rows.map((row) => [row.corporationId, row]));
  return new Map(
    corporationIds.map((corporationId) => {
      const row = found.get(corporationId);
      return [
        corporationId,
        {
          corporationId,
          name: row?.name ?? null,
          factionId: row?.factionId ?? null,
        },
      ];
    }),
  );
}

export async function readAgentRefs(
  ids: readonly (number | null | undefined)[],
): Promise<Map<number, AgentRef>> {
  const characterIds = unique(ids);
  if (characterIds.length === 0) return new Map();
  const [characters, agents] = await Promise.all([
    prisma.character.findMany({
      select: {
        characterId: true,
        name: true,
        corporationId: true,
        corporation: { select: { name: true } },
      },
      where: { characterId: { in: characterIds } },
    }),
    prisma.agent.findMany({
      select: {
        characterId: true,
        level: true,
        stationId: true,
        AgentType: { select: { name: true } },
        AgentDivision: { select: { displayName: true, name: true } },
        station: {
          select: {
            name: true,
            solarSystemId: true,
            solarSystem: {
              select: {
                name: true,
                constellationId: true,
                constellation: {
                  select: {
                    name: true,
                    regionId: true,
                    region: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      where: { characterId: { in: characterIds } },
    }),
  ]);
  const characterById = new Map(characters.map((c) => [c.characterId, c]));
  const agentById = new Map(agents.map((a) => [a.characterId, a]));

  return new Map(
    characterIds.map((characterId) => {
      const character = characterById.get(characterId);
      const agent = agentById.get(characterId);
      const system = agent?.station.solarSystem;
      const constellation = system?.constellation;
      return [
        characterId,
        {
          characterId,
          name: character?.name ?? null,
          level: agent?.level ?? null,
          agentTypeName: agent?.AgentType.name ?? null,
          divisionName:
            agent?.AgentDivision.displayName ??
            agent?.AgentDivision.name ??
            null,
          corporationId: character?.corporationId ?? null,
          corporationName: character?.corporation.name ?? null,
          stationId: agent?.stationId ?? null,
          stationName: agent?.station.name ?? null,
          solarSystemId: agent?.station.solarSystemId ?? null,
          solarSystemName: system?.name ?? null,
          constellationId: system?.constellationId ?? null,
          constellationName: constellation?.name ?? null,
          regionId: constellation?.regionId ?? null,
          regionName: constellation?.region?.name ?? null,
        },
      ];
    }),
  );
}

export async function readDungeonRefs(
  ids: readonly (number | null | undefined)[],
): Promise<Map<number, DungeonRef>> {
  const dungeonIds = unique(ids);
  if (dungeonIds.length === 0) return new Map();
  const rows = await prisma.dungeon.findMany({
    select: {
      dungeonId: true,
      name: true,
      archetypeId: true,
      factionId: true,
      isDeleted: true,
    },
    where: { dungeonId: { in: dungeonIds } },
  });
  const archetypes = await prisma.archetype.findMany({
    select: { archetypeId: true, title: true },
    where: { archetypeId: { in: unique(rows.map((row) => row.archetypeId)) } },
  });
  const titles = new Map(archetypes.map((a) => [a.archetypeId, a.title]));
  const found = new Map(
    rows.filter((row) => !row.isDeleted).map((row) => [row.dungeonId, row]),
  );
  return new Map(
    dungeonIds.map((dungeonId) => {
      const row = found.get(dungeonId);
      return [
        dungeonId,
        {
          dungeonId,
          name: row?.name ?? null,
          archetypeId: row?.archetypeId ?? null,
          archetypeTitle:
            row === undefined ? null : (titles.get(row.archetypeId) ?? null),
          factionId: row?.factionId ?? null,
        },
      ];
    }),
  );
}
