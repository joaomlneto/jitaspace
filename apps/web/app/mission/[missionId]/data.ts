import type { EpicArc } from "~/lib/epicArcs";
import type {
  AgentRef,
  CorporationRef,
  DungeonRef,
  FactionRef,
  TypeRef,
} from "~/lib/missionRefs";
import type { MissionKind, MissionTextValues } from "~/lib/missions";
import { prisma } from "~/lib/db";
import {
  buildEpicArcs,
  epicArcAgentIds,
  epicArcFactionIds,
  readEpicArcRows,
} from "~/lib/epicArcData";
import {
  readAgentRefs,
  readCorporationRefs,
  readDungeonRefs,
  readFactionRefs,
  readTypeRefs,
} from "~/lib/missionRefs";
import { missionKind, missionMessageRank } from "~/lib/missions";
import { cacheSdeRead } from "~/lib/sdeCache";

export interface TypeQuantity {
  type: TypeRef;
  quantity: number | null;
}

/** Another mission sharing this one's name — usually the same mission for another faction or level. */
export interface MissionVariant {
  missionId: number;
  kind: MissionKind;
  faction: FactionRef | null;
  corporation: CorporationRef | null;
  dungeonId: number | null;
  objective: TypeQuantity | null;
  reward: TypeQuantity | null;
}

export interface MissionDetail {
  missionId: number;
  name: string;
  kind: MissionKind;
  faction: FactionRef | null;
  corporation: CorporationRef | null;
  /** The offering corporation's faction, when it has a corporation. */
  corporationFaction: FactionRef | null;
  /**
   * Who hands the mission out, as far as the SDE can tell: the mission's own
   * corporation and faction, else its offering agent's, else its epic arc's
   * faction. For the page header; `faction` and `corporation` stay as stored.
   */
  issuer: {
    corporation: CorporationRef | null;
    faction: FactionRef | null;
  };
  agentType: { agentTypeId: number; name: string | null } | null;
  /** Minutes the offer stays open; `0` means it never lapses. */
  expirationTime: number | null;
  hasStandingRewards: boolean | null;
  initialAgentGift: TypeQuantity | null;
  kill: {
    dungeon: DungeonRef | null;
    objective: TypeQuantity | null;
    /** The quantity alone, for a kill block naming no item. */
    objectiveQuantity: number | null;
    dropItem: TypeRef | null;
  } | null;
  courier: {
    objective: TypeQuantity | null;
    singleton: boolean | null;
  } | null;
  reward: TypeQuantity | null;
  bonusReward: TypeQuantity | null;
  /** Minutes within which the bonus reward is earned. */
  bonusTimeInterval: number | null;
  extraStandings: { faction: FactionRef; value: number }[];
  /** Messages in conversation order. */
  messages: { key: string; text: string }[];
  /** What the placeholders in `messages` resolve to, as far as the SDE knows. */
  textValues: MissionTextValues;
  /** The agent who offers this mission, when the SDE names exactly one. */
  agent: AgentRef | null;
  epicArcs: EpicArc[];
  variants: MissionVariant[];
  /** Other missions that send the pilot into the same dungeon. */
  dungeonMissionCount: number;
}

const typeQuantity = (
  types: Map<number, TypeRef>,
  typeId: number | null,
  quantity: number | null,
): TypeQuantity | null => {
  if (typeId === null) return null;
  const type = types.get(typeId);
  return type ? { type, quantity } : null;
};

/** `map.get(id)`, or `null` for a missing id or entry. */
const pick = <V>(map: Map<number, V>, id: number | null | undefined) =>
  id == null ? null : (map.get(id) ?? null);

/** The item a mission asks for: the kill block's, or the courier block's. */
function objectiveOf(
  row: {
    killObjectiveTypeId: number | null;
    killObjectiveQuantity: number | null;
    courierObjectiveTypeId: number | null;
    courierObjectiveQuantity: number | null;
  },
  kind: MissionKind,
  types: Map<number, TypeRef>,
): TypeQuantity | null {
  return kind === "kill"
    ? typeQuantity(types, row.killObjectiveTypeId, row.killObjectiveQuantity)
    : typeQuantity(
        types,
        row.courierObjectiveTypeId,
        row.courierObjectiveQuantity,
      );
}

/** A corporation's faction, as it came along with the corporation. */
const corporationFaction = (
  corporation: CorporationRef | null,
): FactionRef | null =>
  corporation?.factionId == null
    ? null
    : { factionId: corporation.factionId, name: corporation.factionName };

/** The offering agent's corporation, from what the agent lookup read. */
const agentCorporationOf = (agent: AgentRef | null): CorporationRef | null =>
  agent?.corporationId == null
    ? null
    : {
        corporationId: agent.corporationId,
        name: agent.corporationName,
        factionId: agent.corporationFactionId,
        factionName: agent.corporationFactionName,
      };

/**
 * What a mission's placeholders can be filled in with, as far as the SDE
 * knows. The game resolves the rest (locations, the pilot) from the live offer.
 */
function missionTextValues(known: {
  objective: TypeQuantity | null;
  reward: TypeQuantity | null;
  corporation: CorporationRef | null;
  faction: FactionRef | null;
  agent: AgentRef | null;
}): MissionTextValues {
  const { objective, reward, corporation, faction, agent } = known;
  const entries: [string, string | number | null | undefined][] = [
    ["objectiveTypeID", objective?.type.name],
    ["objectiveQuantity", objective?.quantity],
    ["rewardTypeID", reward?.type.name],
    ["rewardQuantity", reward?.quantity],
    ["agentCorpID", corporation?.name],
    ["agentFactionID", faction?.name],
    ["agentID", agent?.name],
    ["agentStationID", agent?.stationName],
    ["agentSolarSystemID", agent?.solarSystemName],
    ["agentConstellationID", agent?.constellationName],
    ["agentRegionID", agent?.regionName],
  ];
  const values: MissionTextValues = {};
  for (const [key, value] of entries) if (value != null) values[key] = value;
  return values;
}

/**
 * Everything about one mission, or `null` when there is no such mission.
 *
 * Throws on a database failure rather than returning `null`: a `null` here is
 * a cached 404 (see CLAUDE.md → "Never catch a database error inside a
 * `"use cache"` scope").
 */
export async function getMission(
  missionId: number,
): Promise<MissionDetail | null> {
  "use cache";
  cacheSdeRead();

  const mission = await prisma.mission.findUnique({
    include: {
      messages: {
        select: { key: true, text: true },
        where: { isDeleted: false },
      },
      extraStandings: {
        select: { factionId: true, value: true },
        where: { isDeleted: false },
      },
      epicArcMissions: {
        select: { epicArcId: true, agentId: true },
        where: { isDeleted: false },
      },
    },
    where: { missionId },
  });
  if (mission === null || mission.isDeleted) return null;

  const [arcRows, variantRows, dungeonMissionCount] = await Promise.all([
    readEpicArcRows(mission.epicArcMissions.map((step) => step.epicArcId)),
    prisma.mission.findMany({
      select: {
        missionId: true,
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
      },
      where: {
        name: mission.name,
        missionId: { not: missionId },
        isDeleted: false,
      },
      orderBy: { missionId: "asc" },
    }),
    mission.killDungeonId === null
      ? Promise.resolve(0)
      : prisma.mission.count({
          where: {
            killDungeonId: mission.killDungeonId,
            missionId: { not: missionId },
            isDeleted: false,
          },
        }),
  ]);

  // The offering agent: only when every arc this mission is in names the same
  // one, so the page never puts words in the wrong agent's mouth.
  const offeringAgentIds = [
    ...new Set(mission.epicArcMissions.map((step) => step.agentId)),
  ];
  const offeringAgentId =
    offeringAgentIds.length === 1 ? (offeringAgentIds[0] ?? null) : null;

  // One round for every lookup: none depends on another. Corporations bring
  // their faction along, and the offering agent its corporation's.
  const [types, agents, dungeons, agentType, corporations, factions] =
    await Promise.all([
      readTypeRefs([
        mission.initialAgentGiftTypeId,
        mission.killObjectiveTypeId,
        mission.killDropItemInMissionContainerTypeId,
        mission.courierObjectiveTypeId,
        mission.rewardTypeId,
        mission.bonusRewardTypeId,
        ...variantRows.flatMap((v) => [
          v.killObjectiveTypeId,
          v.courierObjectiveTypeId,
          v.rewardTypeId,
        ]),
      ]),
      readAgentRefs([offeringAgentId, ...epicArcAgentIds(arcRows)]),
      readDungeonRefs([mission.killDungeonId]),
      mission.agentTypeId === null
        ? Promise.resolve(null)
        : prisma.agentType.findUnique({
            select: { agentTypeId: true, name: true },
            where: { agentTypeId: mission.agentTypeId },
          }),
      readCorporationRefs([
        mission.corporationId,
        ...variantRows.map((v) => v.corporationId),
      ]),
      readFactionRefs([
        mission.factionId,
        ...mission.extraStandings.map((s) => s.factionId),
        ...epicArcFactionIds(arcRows),
        ...variantRows.map((v) => v.factionId),
      ]),
    ]);
  const offeringAgent = pick(agents, offeringAgentId);
  const corporation = pick(corporations, mission.corporationId);
  const agentCorporation = agentCorporationOf(offeringAgent);

  const factionRef = (id: number | null | undefined) => pick(factions, id);

  const kind = missionKind(mission);
  const objective = objectiveOf(mission, kind, types);
  const reward = typeQuantity(
    types,
    mission.rewardTypeId,
    mission.rewardQuantity,
  );

  // Who hands the mission out: its own corporation and faction, else its
  // offering agent's, else its epic arc's.
  const issuerCorporation = corporation ?? agentCorporation;
  const issuerFaction =
    factionRef(mission.factionId) ??
    corporationFaction(issuerCorporation) ??
    factionRef(arcRows.arcs[0]?.factionId);

  return {
    missionId: mission.missionId,
    name: mission.name,
    kind,
    faction: factionRef(mission.factionId),
    corporation,
    corporationFaction: corporationFaction(corporation),
    issuer: { corporation: issuerCorporation, faction: issuerFaction },
    agentType:
      mission.agentTypeId === null
        ? null
        : {
            agentTypeId: mission.agentTypeId,
            name: agentType?.name ?? null,
          },
    expirationTime: mission.expirationTime,
    hasStandingRewards: mission.hasStandingRewards,
    initialAgentGift: typeQuantity(
      types,
      mission.initialAgentGiftTypeId,
      mission.initialAgentGiftQuantity,
    ),
    kill:
      kind === "kill"
        ? {
            dungeon: pick(dungeons, mission.killDungeonId),
            objective,
            objectiveQuantity: mission.killObjectiveQuantity,
            dropItem: pick(types, mission.killDropItemInMissionContainerTypeId),
          }
        : null,
    courier:
      kind === "courier"
        ? { objective, singleton: mission.courierObjectiveSingleton }
        : null,
    reward,
    bonusReward: typeQuantity(
      types,
      mission.bonusRewardTypeId,
      mission.bonusRewardQuantity,
    ),
    bonusTimeInterval: mission.bonusTimeInterval,
    extraStandings: mission.extraStandings
      .flatMap((standing) => {
        const faction = factionRef(standing.factionId);
        return faction ? [{ faction, value: standing.value }] : [];
      })
      .sort((a, b) => b.value - a.value),
    messages: mission.messages.toSorted(
      (a, b) => missionMessageRank(a.key) - missionMessageRank(b.key),
    ),
    textValues: missionTextValues({
      objective,
      reward,
      corporation: issuerCorporation,
      faction: issuerFaction,
      agent: offeringAgent,
    }),
    agent: offeringAgent,
    epicArcs: buildEpicArcs(arcRows, agents, factions),
    variants: variantRows.map((variant) => {
      const variantKind = missionKind(variant);
      return {
        missionId: variant.missionId,
        kind: variantKind,
        faction: factionRef(variant.factionId),
        corporation: pick(corporations, variant.corporationId),
        dungeonId: variant.killDungeonId,
        objective: objectiveOf(variant, variantKind, types),
        reward: typeQuantity(
          types,
          variant.rewardTypeId,
          variant.rewardQuantity,
        ),
      };
    }),
    dungeonMissionCount,
  };
}
