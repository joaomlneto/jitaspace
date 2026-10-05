import { describe, expect, it } from "@jest/globals";

import type { EpicArcStep } from "~/lib/epicArcs";
import type { AgentRef } from "~/lib/missionRefs";
import {
  epicArcAgents,
  epicArcShape,
  epicArcSummary,
  isRepeatable,
  orderArcSteps,
} from "~/lib/epicArcs";

const node = (missionId: number, nextMissionIds: number[]) => ({
  missionId,
  nextMissionIds,
});

const agent = (characterId: number, name: string): AgentRef => ({
  characterId,
  name,
  level: 1,
  agentTypeName: null,
  divisionName: null,
  corporationId: null,
  corporationName: null,
  corporationFactionId: null,
  corporationFactionName: null,
  stationId: null,
  stationName: null,
  solarSystemId: null,
  solarSystemName: null,
  constellationId: null,
  constellationName: null,
  regionId: null,
  regionName: null,
});

const step = (
  missionId: number,
  nextMissionIds: number[],
  stepAgent: AgentRef | null,
): EpicArcStep => ({
  missionId,
  name: `Mission ${missionId}`,
  kind: "other",
  rewardIsk: null,
  bonusIsk: null,
  chapterTitle: null,
  agent: stepAgent,
  failMissionId: null,
  nextMissionIds,
});

describe("orderArcSteps", () => {
  it("plays the arc breadth-first from its start", () => {
    // 1 → 2 → (4 | 3), stored out of order: a choice's options keep the
    // order the step lists them in.
    const steps = [node(4, []), node(2, [4, 3]), node(3, []), node(1, [2])];
    expect(orderArcSteps(steps).map((s) => s.missionId)).toEqual([1, 2, 4, 3]);
  });

  it("visits a step two branches rejoin at only once", () => {
    const steps = [node(1, [2, 3]), node(2, [4]), node(3, [4]), node(4, [])];
    expect(orderArcSteps(steps).map((s) => s.missionId)).toEqual([1, 2, 3, 4]);
  });

  it("keeps a loop no start leads into, at the end", () => {
    const steps = [node(1, []), node(8, [9]), node(9, [8])];
    expect(orderArcSteps(steps).map((s) => s.missionId)).toEqual([1, 8, 9]);
  });
});

describe("epicArcShape", () => {
  it("finds where an arc starts, branches and ends", () => {
    const steps = [node(1, [2]), node(2, [3, 4]), node(3, []), node(4, [])];
    expect(epicArcShape(steps)).toEqual({
      starts: [1],
      branchPoints: [2],
      endings: [3, 4],
    });
  });
});

describe("epicArcAgents", () => {
  it("lists each agent once, in first-met order, with their step count", () => {
    const alitura = agent(3019356, "Sister Alitura");
    const tevis = agent(3019358, "Tevis Jak");
    const steps = [
      step(1, [2], alitura),
      step(2, [3], tevis),
      step(3, [4], alitura),
      step(4, [], null),
    ];
    expect(epicArcAgents(steps)).toEqual([
      { agent: alitura, stepCount: 2, firstMissionId: 1 },
      { agent: tevis, stepCount: 1, firstMissionId: 2 },
    ]);
  });
});

describe("isRepeatable", () => {
  it("treats the SDE's one-minute interval as no timer", () => {
    expect(isRepeatable(129600)).toBe(true);
    expect(isRepeatable(1)).toBe(false);
    expect(isRepeatable(null)).toBe(false);
  });
});

describe("epicArcSummary", () => {
  it("counts rewards and time bonuses, and keeps every start", () => {
    const alitura = agent(3019356, "Sister Alitura");
    const steps: EpicArcStep[] = [
      { ...step(1, [3], alitura), rewardIsk: 100, chapterTitle: "One" },
      { ...step(2, [3], null), bonusIsk: 50 },
      { ...step(3, [4, 5], alitura), rewardIsk: 10, bonusIsk: 5 },
      step(4, [], alitura),
      step(5, [], null),
    ];

    const { starts, ...summary } = epicArcSummary({
      epicArcId: 1,
      name: "Arc",
      faction: null,
      iconId: null,
      arcRestartInterval: 1,
      steps,
    });

    expect(summary).toEqual({
      missionCount: 5,
      agentCount: 1,
      chapterCount: 1,
      choiceCount: 1,
      endingCount: 2,
      totalIsk: 165,
    });
    expect(starts.map((s) => s.missionId)).toEqual([1, 2]);
  });
});
