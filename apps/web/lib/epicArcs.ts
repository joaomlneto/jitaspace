/**
 * Epic arcs (epicArcs.yaml): branching chains of agent missions.
 *
 * Pure and dependency-free, so the mission page, the arc page and the arc index
 * order and describe an arc the same way. The database reads live in
 * `~/lib/epicArcData`.
 */

import type { AgentRef, FactionRef } from "~/lib/missionRefs";
import type { MissionKind } from "~/lib/missions";

/** One step of an epic arc, as the arc's table lists it. */
export interface EpicArcStep {
  missionId: number;
  name: string | null;
  kind: MissionKind;
  /** The step's ISK reward, when it pays one. */
  rewardIsk: number | null;
  /** The ISK time bonus for finishing the step quickly, when it pays one. */
  bonusIsk: number | null;
  /** The epic journal's chapter heading for this step, when it has one. */
  chapterTitle: string | null;
  agent: AgentRef | null;
  /** Where failing this step leads; the step itself means "try again". */
  failMissionId: number | null;
  nextMissionIds: number[];
}

export interface EpicArc {
  epicArcId: number;
  name: string;
  faction: FactionRef | null;
  iconId: number | null;
  /**
   * Minutes before the arc can be run again. The SDE gives `1` for the arcs
   * that are not repeatable on a timer (see {@link isRepeatable}).
   */
  arcRestartInterval: number | null;
  /** Every step of the arc, in the order the arc is played. */
  steps: EpicArcStep[];
}

/**
 * Whether an arc restarts on a timer. epicArcs.yaml gives every arc an
 * interval, but 12 of the 21 have `1` (a minute), which reads as a
 * placeholder rather than a cooldown; the rest have 129,600 (90 days).
 */
export function isRepeatable(arcRestartInterval: number | null): boolean {
  return arcRestartInterval !== null && arcRestartInterval > 1;
}

/**
 * Arc steps in play order: breadth-first from the steps nothing leads to,
 * following `nextMissionIds`; anything unreachable (a loop no start enters)
 * goes last. Input order breaks ties, so callers sort by mission id first.
 */
export function orderArcSteps<
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

export interface EpicArcShape {
  /** Steps nothing leads to: where the arc begins. */
  starts: number[];
  /** Steps that lead to more than one next step: the arc's choices. */
  branchPoints: number[];
  /** Steps that lead nowhere: the arc's endings. */
  endings: number[];
}

/** Where an arc begins, branches and ends, as mission ids in step order. */
export function epicArcShape(
  steps: readonly { missionId: number; nextMissionIds: number[] }[],
): EpicArcShape {
  const targets = new Set(steps.flatMap((step) => step.nextMissionIds));
  return {
    starts: steps
      .filter((step) => !targets.has(step.missionId))
      .map((step) => step.missionId),
    branchPoints: steps
      .filter((step) => step.nextMissionIds.length > 1)
      .map((step) => step.missionId),
    endings: steps
      .filter((step) => step.nextMissionIds.length === 0)
      .map((step) => step.missionId),
  };
}

/** The distinct agents of an arc, in the order the arc first meets them. */
export function epicArcAgents(
  steps: readonly EpicArcStep[],
): { agent: AgentRef; stepCount: number; firstMissionId: number }[] {
  const byAgent = new Map<
    number,
    { agent: AgentRef; stepCount: number; firstMissionId: number }
  >();
  for (const step of steps) {
    if (!step.agent) continue;
    const entry = byAgent.get(step.agent.characterId);
    if (entry) entry.stepCount += 1;
    else {
      byAgent.set(step.agent.characterId, {
        agent: step.agent,
        stepCount: 1,
        firstMissionId: step.missionId,
      });
    }
  }
  return [...byAgent.values()];
}

export interface EpicArcSummary {
  missionCount: number;
  agentCount: number;
  chapterCount: number;
  /** Steps that lead to more than one next mission. */
  choiceCount: number;
  endingCount: number;
  /** Rewards and time bonuses of every step, every branch counted. */
  totalIsk: number;
  /** The steps an arc can begin with; some arcs offer several. */
  starts: EpicArcStep[];
}

/** The figures the arc index, header, overview and metadata all show. */
export function epicArcSummary(arc: EpicArc): EpicArcSummary {
  const shape = epicArcShape(arc.steps);
  const startIds = new Set(shape.starts);
  return {
    missionCount: arc.steps.length,
    agentCount: epicArcAgents(arc.steps).length,
    chapterCount: arc.steps.filter((step) => step.chapterTitle).length,
    choiceCount: shape.branchPoints.length,
    endingCount: shape.endings.length,
    totalIsk: arc.steps.reduce(
      (sum, step) => sum + (step.rewardIsk ?? 0) + (step.bonusIsk ?? 0),
      0,
    ),
    starts: arc.steps.filter((step) => startIds.has(step.missionId)),
  };
}
