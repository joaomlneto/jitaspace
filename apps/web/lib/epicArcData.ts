import type { EpicArc } from "~/lib/epicArcs";
import type { AgentRef, FactionRef } from "~/lib/missionRefs";
import { prisma } from "~/lib/db";
import { orderArcSteps } from "~/lib/epicArcs";
import { ISK_TYPE_ID, missionKind } from "~/lib/missions";

/**
 * Database reads shared by every page that shows an epic arc. Call these from
 * inside a `"use cache"` scope and let them throw (see `~/lib/missionRefs`).
 */

const CHAPTER_TITLE_KEY = "messages.epicMission.journalText.chapterTitle";

/**
 * Arc rows and every step of them, with each step's mission summary and
 * journal chapter title in the same round trip. Ids of deleted arcs drop out.
 * Pass `undefined` for every arc.
 */
export async function readEpicArcRows(epicArcIds?: number[]) {
  if (epicArcIds?.length === 0) return { arcs: [], arcSteps: [] };
  const where =
    epicArcIds === undefined
      ? { isDeleted: false }
      : { epicArcId: { in: epicArcIds }, isDeleted: false };
  const [arcs, arcSteps] = await Promise.all([
    prisma.epicArc.findMany({
      where,
      orderBy: { epicArcId: "asc" },
    }),
    prisma.epicArcMission.findMany({
      select: {
        epicArcId: true,
        missionId: true,
        agentId: true,
        failMissionId: true,
        mission: {
          select: {
            name: true,
            killDungeonId: true,
            killObjectiveTypeId: true,
            killObjectiveQuantity: true,
            killDropItemInMissionContainerTypeId: true,
            courierObjectiveTypeId: true,
            courierObjectiveQuantity: true,
            rewardTypeId: true,
            rewardQuantity: true,
            bonusRewardTypeId: true,
            bonusRewardQuantity: true,
            isDeleted: true,
            messages: {
              select: { text: true },
              where: { key: CHAPTER_TITLE_KEY, isDeleted: false },
              take: 1,
            },
          },
        },
        nextMissions: {
          select: { nextMissionId: true },
          where: { isDeleted: false },
        },
      },
      where,
    }),
  ]);
  return { arcs, arcSteps };
}

/** An amount of the "Credits" type is ISK; any other reward is an item. */
const iskOf = (typeId: number | null, quantity: number | null) =>
  typeId === ISK_TYPE_ID ? quantity : null;

export type EpicArcRows = Awaited<ReturnType<typeof readEpicArcRows>>;

/** Agent ids an arc's steps name: what {@link buildEpicArcs} needs looked up. */
export const epicArcAgentIds = (rows: EpicArcRows) =>
  rows.arcSteps.map((step) => step.agentId);

/** Faction ids the arcs name: what {@link buildEpicArcs} needs looked up. */
export const epicArcFactionIds = (rows: EpicArcRows) =>
  rows.arcs.map((arc) => arc.factionId);

/**
 * The arcs, each with its steps in play order. `agents` and `factions` are
 * the lookups for {@link epicArcAgentIds} and {@link epicArcFactionIds}; the
 * caller reads them alongside its own, in one round.
 */
export function buildEpicArcs(
  { arcs, arcSteps }: EpicArcRows,
  agents: Map<number, AgentRef>,
  factions: Map<number, FactionRef>,
): EpicArc[] {
  return arcs.map((arc) => ({
    epicArcId: arc.epicArcId,
    name: arc.name,
    faction:
      arc.factionId === null ? null : (factions.get(arc.factionId) ?? null),
    iconId: arc.iconId,
    arcRestartInterval: arc.arcRestartInterval,
    steps: orderArcSteps(
      arcSteps
        // A step whose mission was soft-deleted reads as gone, like any other
        // deleted row the pages look up.
        .filter(
          (step) => step.epicArcId === arc.epicArcId && !step.mission.isDeleted,
        )
        .map(({ mission, ...step }) => ({
          missionId: step.missionId,
          name: mission.name,
          kind: missionKind(mission),
          rewardIsk: iskOf(mission.rewardTypeId, mission.rewardQuantity),
          bonusIsk: iskOf(
            mission.bonusRewardTypeId,
            mission.bonusRewardQuantity,
          ),
          chapterTitle: mission.messages[0]?.text ?? null,
          agent:
            step.agentId === null ? null : (agents.get(step.agentId) ?? null),
          failMissionId: step.failMissionId,
          nextMissionIds: step.nextMissions
            .map((next) => next.nextMissionId)
            .sort((a, b) => a - b),
        }))
        .sort((a, b) => a.missionId - b.missionId),
    ),
  }));
}
