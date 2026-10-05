/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DungeonData from "~/app/dungeon/[dungeonId]/data";
import type * as MissionData from "~/app/mission/[missionId]/data";

// The mission and dungeon routes resolve everything on the server from plain
// id columns. These tests drive `getMission` / `getDungeon` against a stubbed
// Prisma client, one canned answer per model method.

type Rows = Record<string, unknown>[];
type Query = jest.Mock<(args?: unknown) => Promise<unknown>>;

const query = (): Query => jest.fn<(args?: unknown) => Promise<unknown>>();

const db = {
  mission: { findUnique: query(), findMany: query(), count: query() },
  missionMessage: { findMany: query() },
  epicArc: { findMany: query() },
  epicArcMission: { findMany: query() },
  agentType: { findUnique: query() },
  type: { findMany: query() },
  faction: { findMany: query() },
  corporation: { findMany: query() },
  character: { findMany: query() },
  agent: { findMany: query() },
  dungeon: { findUnique: query(), findMany: query() },
  archetype: { findUnique: query(), findMany: query() },
  agentInSpace: { findMany: query() },
  mercenaryTacticalOperation: { findMany: query() },
};
jest.mock("~/lib/db", () => ({ prisma: db }));

jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  cacheTag: () => undefined,
}));

const getTypeList = jest.fn<(id: number) => Promise<unknown>>();
jest.mock("~/app/type-list/[typeListId]/data", () => ({
  getTypeList: (id: number) => getTypeList(id),
}));

// Required, not imported: an import would load the modules before `db` above
// exists, and their Prisma mock would capture an uninitialised binding.
const { getMission } =
  require("~/app/mission/[missionId]/data") as typeof MissionData;
const { getDungeon } =
  require("~/app/dungeon/[dungeonId]/data") as typeof DungeonData;

const missionRow = (overrides: Record<string, unknown> = {}) => ({
  missionId: 875,
  name: "The Guristas Spies",
  factionId: null,
  corporationId: null,
  agentTypeId: null,
  expirationTime: null,
  hasStandingRewards: true,
  initialAgentGiftTypeId: null,
  initialAgentGiftQuantity: null,
  killDungeonId: 213,
  killObjectiveTypeId: null,
  killObjectiveQuantity: 0,
  killDropItemInMissionContainerTypeId: null,
  courierObjectiveTypeId: null,
  courierObjectiveQuantity: null,
  courierObjectiveSingleton: null,
  rewardTypeId: null,
  rewardQuantity: null,
  bonusRewardTypeId: null,
  bonusRewardQuantity: null,
  bonusTimeInterval: null,
  isDeleted: false,
  messages: [],
  extraStandings: [],
  epicArcMissions: [],
  ...overrides,
});

beforeEach(() => {
  for (const model of Object.values(db)) {
    for (const method of Object.values(model)) {
      method.mockReset().mockResolvedValue([]);
    }
  }
  db.mission.findUnique.mockResolvedValue(null);
  db.mission.count.mockResolvedValue(0);
  db.agentType.findUnique.mockResolvedValue(null);
  db.dungeon.findUnique.mockResolvedValue(null);
  db.archetype.findUnique.mockResolvedValue(null);
  getTypeList.mockReset().mockResolvedValue(null);
});

describe("getMission", () => {
  it("returns null for a mission that does not exist", async () => {
    expect(await getMission(1)).toBeNull();
  });

  it("returns null for a deleted mission", async () => {
    db.mission.findUnique.mockResolvedValue(missionRow({ isDeleted: true }));
    expect(await getMission(875)).toBeNull();
  });

  it("orders messages as the conversation goes, and resolves the objective", async () => {
    db.mission.findUnique.mockResolvedValue(
      missionRow({
        killObjectiveTypeId: 34,
        killObjectiveQuantity: 5,
        rewardTypeId: 29,
        rewardQuantity: 100000,
        messages: [
          { key: "messages.mission.completed.agentsays", text: "Done." },
          { key: "messages.mission.briefing", text: "Go." },
        ],
      }),
    );
    db.type.findMany.mockResolvedValue([
      {
        typeId: 34,
        name: "Tritanium",
        groupId: 18,
        group: { name: "Mineral" },
      },
      { typeId: 29, name: "Credits", groupId: 1, group: { name: "Money" } },
    ] satisfies Rows);
    db.dungeon.findMany.mockResolvedValue([]);
    db.mission.count.mockResolvedValue(2);

    const mission = await getMission(875);

    expect(mission?.kind).toBe("kill");
    expect(mission?.messages.map((m) => m.key)).toEqual([
      "messages.mission.briefing",
      "messages.mission.completed.agentsays",
    ]);
    expect(mission?.kill?.objective).toEqual({
      type: {
        typeId: 34,
        name: "Tritanium",
        groupId: 18,
        groupName: "Mineral",
      },
      quantity: 5,
    });
    // Mission 213's pocket is not in dungeons.yaml: the id survives, unnamed.
    expect(mission?.kill?.dungeon).toEqual({
      dungeonId: 213,
      name: null,
      archetypeId: null,
      archetypeTitle: null,
      factionId: null,
    });
    expect(mission?.dungeonMissionCount).toBe(2);
    expect(mission?.textValues).toMatchObject({
      objectiveTypeID: "Tritanium",
      objectiveQuantity: 5,
      rewardTypeID: "Credits",
      rewardQuantity: 100000,
    });
  });

  it("walks an epic arc in play order and takes the issuer from its agent", async () => {
    db.mission.findUnique.mockResolvedValue(
      missionRow({
        missionId: 2,
        name: "Second",
        killDungeonId: null,
        killObjectiveQuantity: null,
        epicArcMissions: [{ epicArcId: 7, agentId: 3019356 }],
      }),
    );
    db.epicArc.findMany.mockResolvedValue([
      {
        epicArcId: 7,
        name: "The Blood-Stained Stars",
        factionId: 500016,
        iconId: 3807,
        arcRestartInterval: 129600,
      },
    ]);
    const step = (missionId: number, next: number[], agentId = 3019356) => ({
      epicArcId: 7,
      missionId,
      agentId,
      failMissionId: missionId,
      mission: { name: `Mission ${missionId}` },
      nextMissions: next.map((nextMissionId) => ({ nextMissionId })),
    });
    // Stored out of order, with a branch and a loop no start leads into.
    db.epicArcMission.findMany.mockResolvedValue([
      step(4, []),
      step(9, [8]),
      step(2, [3, 4]),
      step(3, []),
      step(8, [9]),
      step(1, [2]),
    ]);
    db.missionMessage.findMany.mockResolvedValue([
      { missionId: 1, text: "Chapter One" },
    ]);
    db.character.findMany.mockResolvedValue([
      {
        characterId: 3019356,
        name: "Sister Alitura",
        corporationId: 1000130,
        corporation: { name: "Sisters of EVE" },
      },
    ]);
    db.corporation.findMany.mockResolvedValue([
      { corporationId: 1000130, name: "Sisters of EVE", factionId: 500016 },
    ]);
    db.faction.findMany.mockResolvedValue([
      { factionId: 500016, name: "Servant Sisters of EVE" },
    ]);

    const mission = await getMission(2);

    expect(mission?.kind).toBe("other");
    expect(mission?.agent?.name).toBe("Sister Alitura");
    // The row names no corporation or faction; the header borrows the agent's.
    expect(mission?.corporation).toBeNull();
    expect(mission?.issuer.corporation?.name).toBe("Sisters of EVE");
    expect(mission?.issuer.faction?.name).toBe("Servant Sisters of EVE");
    expect(mission?.textValues).toMatchObject({
      agentID: "Sister Alitura",
      agentCorpID: "Sisters of EVE",
      agentFactionID: "Servant Sisters of EVE",
    });

    const [arc] = mission?.epicArcs ?? [];
    expect(arc?.steps.map((s) => s.missionId)).toEqual([1, 2, 3, 4, 8, 9]);
    expect(arc?.steps[0]?.chapterTitle).toBe("Chapter One");
    expect(arc?.steps[1]?.nextMissionIds).toEqual([3, 4]);
  });

  it("names no offering agent when its arcs disagree", async () => {
    db.mission.findUnique.mockResolvedValue(
      missionRow({
        epicArcMissions: [
          { epicArcId: 1, agentId: 10 },
          { epicArcId: 2, agentId: 20 },
        ],
      }),
    );
    const mission = await getMission(875);
    expect(mission?.agent).toBeNull();
    expect(mission?.textValues.agentID).toBeUndefined();
  });

  it("lists same-named missions as variants", async () => {
    db.mission.findUnique.mockResolvedValue(missionRow());
    db.mission.findMany.mockResolvedValue([
      {
        missionId: 888,
        factionId: null,
        corporationId: null,
        killDungeonId: 214,
        killObjectiveTypeId: null,
        killObjectiveQuantity: 0,
        killDropItemInMissionContainerTypeId: null,
        courierObjectiveTypeId: null,
        courierObjectiveQuantity: null,
        rewardTypeId: null,
        rewardQuantity: null,
      },
    ]);

    const mission = await getMission(875);

    expect(db.mission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: "The Guristas Spies",
          missionId: { not: 875 },
          isDeleted: false,
        },
      }),
    );
    expect(mission?.variants).toEqual([
      expect.objectContaining({ missionId: 888, kind: "kill", dungeonId: 214 }),
    ]);
  });
});

describe("getDungeon", () => {
  it("returns null for a dungeon nothing in the SDE knows", async () => {
    expect(await getDungeon(1)).toBeNull();
  });

  it("builds a page for a mission pocket dungeons.yaml does not describe", async () => {
    db.mission.findMany.mockResolvedValue([
      {
        missionId: 875,
        name: "The Guristas Spies",
        factionId: null,
        corporationId: null,
        killDungeonId: 213,
        killObjectiveTypeId: null,
        killObjectiveQuantity: 0,
        killDropItemInMissionContainerTypeId: null,
        courierObjectiveTypeId: null,
        courierObjectiveQuantity: null,
        rewardTypeId: 29,
        rewardQuantity: 50000,
        epicArcMissions: [],
      },
    ]);

    const dungeon = await getDungeon(213);

    expect(dungeon).toMatchObject({
      dungeonId: 213,
      described: false,
      name: null,
      archetype: null,
      restrictions: [],
      related: [],
    });
    expect(dungeon?.missions).toEqual([
      expect.objectContaining({
        missionId: 875,
        kind: "kill",
        rewardIsk: 50000,
      }),
    ]);
  });

  it("reads allowedShipsList as type lists, listing only published ships", async () => {
    db.dungeon.findUnique.mockResolvedValue({
      dungeonId: 43,
      name: "Pith Merchant Depot",
      description: "<P>Supply depot.</P>",
      gameplayDescription: null,
      archetypeId: 24,
      factionId: 500011,
      isDeleted: false,
      allowedShips: [{ typeListId: 478 }],
    });
    db.archetype.findUnique.mockResolvedValue({
      archetypeId: 24,
      title: "Combat Sites",
      description: "Hostile forces.",
    });
    db.dungeon.findMany.mockResolvedValue([
      { dungeonId: 44, name: "Pith Den", factionId: 500011 },
    ]);
    db.faction.findMany.mockResolvedValue([
      { factionId: 500011, name: "Guristas Pirates" },
    ]);
    getTypeList.mockResolvedValue({
      typeListId: 478,
      name: "Dungeon Ship Restrictions [43]",
      displayName: null,
      members: [
        [587, "Rifter", 25, true],
        [9999, "NPC Rifter", 25, false],
      ],
      groups: { 25: { name: "Frigate", categoryId: 6 } },
      categories: { 6: "Ship" },
    });

    const dungeon = await getDungeon(43);

    expect(getTypeList).toHaveBeenCalledWith(478);
    expect(dungeon?.described).toBe(true);
    expect(dungeon?.archetype?.title).toBe("Combat Sites");
    expect(dungeon?.faction?.name).toBe("Guristas Pirates");
    expect(dungeon?.restrictions).toEqual([
      {
        typeListId: 478,
        name: "Dungeon Ship Restrictions [43]",
        displayName: null,
        memberCount: 1,
        members: [[587, "Rifter", 25, true]],
        groups: { 25: "Frigate" },
      },
    ]);
    expect(dungeon?.related).toEqual([
      {
        dungeonId: 44,
        name: "Pith Den",
        factionId: 500011,
        factionName: "Guristas Pirates",
      },
    ]);
  });

  it("lists agents stationed in the dungeon", async () => {
    db.agentInSpace.findMany.mockResolvedValue([
      {
        characterId: 3018343,
        solarSystemId: 30000165,
        spawnPointId: 4239,
        typeId: 20520,
        solarSystem: {
          name: "Ishisomo",
          securityStatus: "0.72",
          constellation: { region: { name: "The Forge" } },
        },
      },
    ]);
    db.character.findMany.mockResolvedValue([
      {
        characterId: 3018343,
        name: "Hansu Turu",
        corporationId: 1000003,
        corporation: { name: "Nugoeihuvi Corporation" },
      },
    ]);
    db.type.findMany.mockResolvedValue([
      { typeId: 20520, name: "Turu's Harpy", groupId: 1, group: { name: "X" } },
    ]);

    const dungeon = await getDungeon(416);

    expect(dungeon?.described).toBe(false);
    expect(dungeon?.agents).toEqual([
      expect.objectContaining({
        solarSystemName: "Ishisomo",
        securityStatus: 0.72,
        regionName: "The Forge",
        spawnPointId: 4239,
        type: expect.objectContaining({ name: "Turu's Harpy" }),
        agent: expect.objectContaining({ name: "Hansu Turu" }),
      }),
    ]);
  });
});
