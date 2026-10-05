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

/** One step of an epic arc, as the arc's table lists it. */
export interface EpicArcStep {
  missionId: number;
  name: string | null;
  /** The epic journal's chapter heading for this step, when it has one. */
  chapterTitle: string | null;
  agent: AgentRef | null;
  failMissionId: number | null;
  nextMissionIds: number[];
}

export interface MissionEpicArc {
  epicArcId: number;
  name: string;
  faction: FactionRef | null;
  iconId: number | null;
  /** Minutes before the arc can be run again. */
  arcRestartInterval: number | null;
  /** Every step of the arc, in the order the arc is played. */
  steps: EpicArcStep[];
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
  epicArcs: MissionEpicArc[];
  variants: MissionVariant[];
  /** Other missions that send the pilot into the same dungeon. */
  dungeonMissionCount: number;
}

const CHAPTER_TITLE_KEY = "messages.epicMission.journalText.chapterTitle";

/**
 * Arc steps in play order: breadth-first from the steps nothing leads to,
 * following `nextMissions`; anything unreachable (a dangling step) goes last.
 */
function orderArcSteps<
  T extends { missionId: number; nextMissionIds: number[] },
>(steps: T[]): T[] {
  const byId = new Map(steps.map((step) => [step.missionId, step]));
  const targets = new Set(steps.flatMap((step) => step.nextMissionIds));
  const queue = steps.filter((step) => !targets.has(step.missionId));
  const seen = new Set<number>();
  const ordered: T[] = [];
  // `queue` grows while it is walked, so this visits every queued step.
  for (const step of queue) {
    if (seen.has(step.missionId)) continue;
    seen.add(step.missionId);
    ordered.push(step);
    for (const nextId of step.nextMissionIds) {
      const next = byId.get(nextId);
      if (next && !seen.has(nextId)) queue.push(next);
    }
  }
  return [...ordered, ...steps.filter((step) => !seen.has(step.missionId))];
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

  const epicArcIds = mission.epicArcMissions.map((step) => step.epicArcId);
  const [arcs, arcSteps, variantRows, dungeonMissionCount] = await Promise.all([
    epicArcIds.length
      ? prisma.epicArc.findMany({
          where: { epicArcId: { in: epicArcIds }, isDeleted: false },
          orderBy: { epicArcId: "asc" },
        })
      : Promise.resolve([]),
    epicArcIds.length
      ? prisma.epicArcMission.findMany({
          select: {
            epicArcId: true,
            missionId: true,
            agentId: true,
            failMissionId: true,
            mission: { select: { name: true } },
            nextMissions: {
              select: { nextMissionId: true },
              where: { isDeleted: false },
            },
          },
          where: { epicArcId: { in: epicArcIds }, isDeleted: false },
        })
      : Promise.resolve([]),
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

  const arcMissionIds = arcSteps.map((step) => step.missionId);
  const chapterTitles = arcMissionIds.length
    ? await prisma.missionMessage.findMany({
        select: { missionId: true, text: true },
        where: {
          missionId: { in: arcMissionIds },
          key: CHAPTER_TITLE_KEY,
          isDeleted: false,
        },
      })
    : [];

  // The offering agent: only when every arc this mission is in names the same
  // one, so the page never puts words in the wrong agent's mouth.
  const offeringAgentIds = [
    ...new Set(mission.epicArcMissions.map((step) => step.agentId)),
  ];
  const offeringAgentId =
    offeringAgentIds.length === 1 ? (offeringAgentIds[0] ?? null) : null;

  const [types, agents, dungeons, agentType] = await Promise.all([
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
    readAgentRefs([offeringAgentId, ...arcSteps.map((step) => step.agentId)]),
    readDungeonRefs([mission.killDungeonId]),
    mission.agentTypeId === null
      ? Promise.resolve(null)
      : prisma.agentType.findUnique({
          select: { agentTypeId: true, name: true },
          where: { agentTypeId: mission.agentTypeId },
        }),
  ]);
  const offeringAgent =
    offeringAgentId === null ? null : (agents.get(offeringAgentId) ?? null);

  const corporations = await readCorporationRefs([
    mission.corporationId,
    offeringAgent?.corporationId,
    ...variantRows.map((v) => v.corporationId),
  ]);
  const corporation =
    mission.corporationId === null
      ? null
      : (corporations.get(mission.corporationId) ?? null);
  const agentCorporation =
    offeringAgent?.corporationId == null
      ? null
      : (corporations.get(offeringAgent.corporationId) ?? null);

  const factions = await readFactionRefs([
    mission.factionId,
    corporation?.factionId,
    agentCorporation?.factionId,
    ...mission.extraStandings.map((s) => s.factionId),
    ...arcs.map((arc) => arc.factionId),
    ...variantRows.map((v) => v.factionId),
  ]);
  const factionRef = (id: number | null | undefined) =>
    id == null ? null : (factions.get(id) ?? null);

  const kind = missionKind(mission);
  const objective =
    kind === "kill"
      ? typeQuantity(
          types,
          mission.killObjectiveTypeId,
          mission.killObjectiveQuantity,
        )
      : typeQuantity(
          types,
          mission.courierObjectiveTypeId,
          mission.courierObjectiveQuantity,
        );
  const reward = typeQuantity(
    types,
    mission.rewardTypeId,
    mission.rewardQuantity,
  );

  // What the messages' placeholders can be filled in with. The game resolves
  // the rest (locations, the pilot) from the live offer.
  const issuerCorporation = corporation ?? agentCorporation;
  const issuerFaction =
    factionRef(mission.factionId) ??
    factionRef(issuerCorporation?.factionId) ??
    factionRef(arcs[0]?.factionId);
  const textValues: MissionTextValues = {};
  const setValue = (key: string, value: string | number | null | undefined) => {
    if (value != null) textValues[key] = value;
  };
  setValue("objectiveTypeID", objective?.type.name);
  setValue("objectiveQuantity", objective?.quantity);
  setValue("rewardTypeID", reward?.type.name);
  setValue("rewardQuantity", reward?.quantity);
  setValue("agentCorpID", issuerCorporation?.name);
  setValue("agentFactionID", issuerFaction?.name);
  setValue("agentID", offeringAgent?.name);
  setValue("agentStationID", offeringAgent?.stationName);
  setValue("agentSolarSystemID", offeringAgent?.solarSystemName);
  setValue("agentConstellationID", offeringAgent?.constellationName);
  setValue("agentRegionID", offeringAgent?.regionName);

  const chapterTitleOf = new Map(
    chapterTitles.map((row) => [row.missionId, row.text]),
  );

  return {
    missionId: mission.missionId,
    name: mission.name,
    kind,
    faction: factionRef(mission.factionId),
    corporation,
    corporationFaction: factionRef(corporation?.factionId),
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
            dungeon:
              mission.killDungeonId === null
                ? null
                : (dungeons.get(mission.killDungeonId) ?? null),
            objective,
            objectiveQuantity: mission.killObjectiveQuantity,
            dropItem:
              mission.killDropItemInMissionContainerTypeId === null
                ? null
                : (types.get(mission.killDropItemInMissionContainerTypeId) ??
                  null),
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
    textValues,
    agent: offeringAgent,
    epicArcs: arcs.map((arc) => ({
      epicArcId: arc.epicArcId,
      name: arc.name,
      faction: factionRef(arc.factionId),
      iconId: arc.iconId,
      arcRestartInterval: arc.arcRestartInterval,
      steps: orderArcSteps(
        arcSteps
          .filter((step) => step.epicArcId === arc.epicArcId)
          .map((step) => ({
            missionId: step.missionId,
            name: step.mission.name,
            chapterTitle: chapterTitleOf.get(step.missionId) ?? null,
            agent:
              step.agentId === null ? null : (agents.get(step.agentId) ?? null),
            failMissionId: step.failMissionId,
            nextMissionIds: step.nextMissions
              .map((next) => next.nextMissionId)
              .sort((a, b) => a - b),
          }))
          .sort((a, b) => a.missionId - b.missionId),
      ),
    })),
    variants: variantRows.map((variant) => {
      const variantKind = missionKind(variant);
      return {
        missionId: variant.missionId,
        kind: variantKind,
        faction: factionRef(variant.factionId),
        corporation:
          variant.corporationId === null
            ? null
            : (corporations.get(variant.corporationId) ?? null),
        dungeonId: variant.killDungeonId,
        objective:
          variantKind === "kill"
            ? typeQuantity(
                types,
                variant.killObjectiveTypeId,
                variant.killObjectiveQuantity,
              )
            : typeQuantity(
                types,
                variant.courierObjectiveTypeId,
                variant.courierObjectiveQuantity,
              ),
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
