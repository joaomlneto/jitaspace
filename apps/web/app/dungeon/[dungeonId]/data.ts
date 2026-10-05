import type { TypeListMember } from "~/app/type-list/[typeListId]/data";
import type {
  AgentRef,
  CorporationRef,
  FactionRef,
  TypeRef,
} from "~/lib/missionRefs";
import type { MissionKind } from "~/lib/missions";
import { getTypeList } from "~/app/type-list/[typeListId]/data";
import { prisma } from "~/lib/db";
import {
  readAgentRefs,
  readCorporationRefs,
  readFactionRefs,
  readTypeRefs,
} from "~/lib/missionRefs";
import { ISK_TYPE_ID, missionKind } from "~/lib/missions";
import { cacheSdeRead } from "~/lib/sdeCache";

/** Restriction lists larger than this link out instead of listing members. */
const MAX_LISTED_RESTRICTION_MEMBERS = 500;

export interface DungeonShipRestriction {
  typeListId: number;
  name: string | null;
  displayName: string | null;
  /** Published member types — the ships a pilot could bring. */
  memberCount: number;
  /** The ships the list allows, or `null` when it is too long to list here. */
  members: TypeListMember[] | null;
  /** Group names of the listed members, keyed by group id. */
  groups: Record<number, string>;
}

export interface DungeonMission {
  missionId: number;
  name: string;
  kind: MissionKind;
  faction: FactionRef | null;
  corporation: CorporationRef | null;
  objective: { type: TypeRef; quantity: number | null } | null;
  rewardIsk: number | null;
  epicArcId: number | null;
  epicArcName: string | null;
}

export interface DungeonAgentInSpace {
  agent: AgentRef;
  solarSystemId: number;
  solarSystemName: string | null;
  securityStatus: number | null;
  regionName: string | null;
  spawnPointId: number;
  /** What the agent sits in — a ship or structure type. */
  type: TypeRef | null;
}

export interface DungeonTacticalOperation {
  mercenaryTacticalOperationId: number;
  name: string;
  description: string;
  anarchyImpact: number;
  developmentImpact: number;
  infomorphBonus: number;
}

export interface RelatedDungeon {
  dungeonId: number;
  name: string;
  factionId: number | null;
  factionName: string | null;
}

export interface DungeonDetail {
  dungeonId: number;
  /**
   * Whether dungeons.yaml describes this dungeon. Most mission dungeons are
   * known only because a mission, an agent or an operation points at them.
   */
  described: boolean;
  name: string | null;
  description: string | null;
  gameplayDescription: string | null;
  archetype: {
    archetypeId: number;
    title: string | null;
    description: string | null;
  } | null;
  faction: FactionRef | null;
  restrictions: DungeonShipRestriction[];
  missions: DungeonMission[];
  agents: DungeonAgentInSpace[];
  operations: DungeonTacticalOperation[];
  /** The other dungeons of the same archetype. */
  related: RelatedDungeon[];
}

/**
 * Everything about one dungeon, or `null` when nothing in the SDE knows it.
 *
 * Throws on a database failure rather than returning `null`: a `null` here is
 * a cached 404 (see CLAUDE.md → "Never catch a database error inside a
 * `"use cache"` scope").
 */
export async function getDungeon(
  dungeonId: number,
): Promise<DungeonDetail | null> {
  "use cache";
  cacheSdeRead();

  const [dungeonRow, missionRows, agentRows, operations] = await Promise.all([
    prisma.dungeon.findUnique({
      include: {
        allowedShips: {
          select: { typeListId: true },
          where: { isDeleted: false },
        },
      },
      where: { dungeonId },
    }),
    prisma.mission.findMany({
      select: {
        missionId: true,
        name: true,
        factionId: true,
        corporationId: true,
        killDungeonId: true,
        killObjectiveTypeId: true,
        killObjectiveQuantity: true,
        killDropItemInMissionContainerTypeId: true,
        courierObjectiveTypeId: true,
        courierObjectiveQuantity: true,
        rewardTypeId: true,
        rewardQuantity: true,
        epicArcMissions: {
          select: { epicArc: { select: { epicArcId: true, name: true } } },
          where: { isDeleted: false },
          take: 1,
        },
      },
      where: { killDungeonId: dungeonId, isDeleted: false },
      orderBy: { missionId: "asc" },
    }),
    prisma.agentInSpace.findMany({
      select: {
        characterId: true,
        solarSystemId: true,
        spawnPointId: true,
        typeId: true,
        solarSystem: {
          select: {
            name: true,
            securityStatus: true,
            constellation: { select: { region: { select: { name: true } } } },
          },
        },
      },
      where: { dungeonId, isDeleted: false },
      orderBy: { characterId: "asc" },
    }),
    prisma.mercenaryTacticalOperation.findMany({
      select: {
        mercenaryTacticalOperationId: true,
        name: true,
        description: true,
        anarchyImpact: true,
        developmentImpact: true,
        infomorphBonus: true,
      },
      where: { dungeonId, isDeleted: false },
      orderBy: { mercenaryTacticalOperationId: "asc" },
    }),
  ]);
  const dungeon = dungeonRow?.isDeleted === false ? dungeonRow : null;
  if (
    dungeon === null &&
    missionRows.length === 0 &&
    agentRows.length === 0 &&
    operations.length === 0
  ) {
    return null;
  }

  const restrictionListIds = (dungeon?.allowedShips ?? [])
    .map((row) => row.typeListId)
    .sort((a, b) => a - b);

  const [archetype, related, typeLists, types, agents, corporations] =
    await Promise.all([
      dungeon === null
        ? Promise.resolve(null)
        : prisma.archetype.findUnique({
            select: { archetypeId: true, title: true, description: true },
            where: { archetypeId: dungeon.archetypeId },
          }),
      dungeon === null
        ? Promise.resolve([])
        : prisma.dungeon.findMany({
            select: { dungeonId: true, name: true, factionId: true },
            where: {
              archetypeId: dungeon.archetypeId,
              dungeonId: { not: dungeonId },
              isDeleted: false,
            },
            orderBy: { dungeonId: "asc" },
          }),
      Promise.all(restrictionListIds.map((id) => getTypeList(id))),
      readTypeRefs([
        ...missionRows.flatMap((m) => [
          m.killObjectiveTypeId,
          m.courierObjectiveTypeId,
        ]),
        ...agentRows.map((a) => a.typeId),
      ]),
      readAgentRefs(agentRows.map((a) => a.characterId)),
      readCorporationRefs(missionRows.map((m) => m.corporationId)),
    ]);

  const factions = await readFactionRefs([
    dungeon?.factionId,
    ...missionRows.map((m) => m.factionId),
    ...related.map((d) => d.factionId),
  ]);
  const factionRef = (id: number | null | undefined) =>
    id == null ? null : (factions.get(id) ?? null);

  return {
    dungeonId,
    described: dungeon !== null,
    name: dungeon?.name ?? null,
    description: dungeon?.description ?? null,
    gameplayDescription: dungeon?.gameplayDescription ?? null,
    archetype:
      dungeon === null
        ? null
        : {
            archetypeId: dungeon.archetypeId,
            title: archetype?.title ?? null,
            description: archetype?.description ?? null,
          },
    faction: factionRef(dungeon?.factionId),
    restrictions: restrictionListIds.map((typeListId, index) => {
      const typeList = typeLists[index] ?? null;
      // Ships a pilot can fly: the lists also hold unpublished NPC and test
      // hulls, which the type list's own page still shows.
      const members = (typeList?.members ?? []).filter(
        ([, , , published]) => published,
      );
      const listed = members.length <= MAX_LISTED_RESTRICTION_MEMBERS;
      const groups: Record<number, string> = {};
      if (typeList && listed) {
        for (const [, , groupId] of members) {
          const group = typeList.groups[groupId];
          if (group) groups[groupId] = group.name;
        }
      }
      return {
        typeListId,
        name: typeList?.name ?? null,
        displayName: typeList?.displayName ?? null,
        memberCount: members.length,
        members: listed ? members : null,
        groups,
      };
    }),
    missions: missionRows.map((mission) => {
      const kind = missionKind(mission);
      const objectiveTypeId =
        kind === "kill"
          ? mission.killObjectiveTypeId
          : mission.courierObjectiveTypeId;
      const objectiveType =
        objectiveTypeId === null ? undefined : types.get(objectiveTypeId);
      return {
        missionId: mission.missionId,
        name: mission.name,
        kind,
        faction: factionRef(mission.factionId),
        corporation:
          mission.corporationId === null
            ? null
            : (corporations.get(mission.corporationId) ?? null),
        objective: objectiveType
          ? {
              type: objectiveType,
              quantity:
                kind === "kill"
                  ? mission.killObjectiveQuantity
                  : mission.courierObjectiveQuantity,
            }
          : null,
        rewardIsk:
          mission.rewardTypeId === ISK_TYPE_ID ? mission.rewardQuantity : null,
        epicArcId: mission.epicArcMissions[0]?.epicArc.epicArcId ?? null,
        epicArcName: mission.epicArcMissions[0]?.epicArc.name ?? null,
      };
    }),
    agents: agentRows.flatMap((row) => {
      const agent = agents.get(row.characterId);
      if (!agent) return [];
      return [
        {
          agent,
          solarSystemId: row.solarSystemId,
          solarSystemName: row.solarSystem.name,
          securityStatus: Number(row.solarSystem.securityStatus),
          regionName: row.solarSystem.constellation.region?.name ?? null,
          spawnPointId: row.spawnPointId,
          type: types.get(row.typeId) ?? null,
        },
      ];
    }),
    operations,
    related: related.map((d) => ({
      dungeonId: d.dungeonId,
      name: d.name,
      factionId: d.factionId,
      factionName: factionRef(d.factionId)?.name ?? null,
    })),
  };
}
