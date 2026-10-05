/**
 * @jest-environment node
 */
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as EpicArcData from "~/app/epic-arc/[epicArcId]/data";
import type * as EpicArcRoute from "~/app/epic-arc/[epicArcId]/page";
import type * as EpicArcsIndex from "~/app/epic-arcs/page";

// The epic arc page's reader, route and the /epic-arcs index, against a stubbed
// Prisma client with one canned answer per model method.

type Query = jest.Mock<(args?: unknown) => Promise<unknown>>;
const query = (): Query => jest.fn<(args?: unknown) => Promise<unknown>>();

const db = {
  epicArc: { findMany: query() },
  epicArcMission: { findMany: query() },
  character: { findMany: query() },
  agent: { findMany: query() },
  faction: { findMany: query() },
};
jest.mock("~/lib/db", () => ({ prisma: db }));
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  cacheTag: () => undefined,
}));
jest.mock("~/app/epic-arc/[epicArcId]/page.client", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("~/app/epic-arcs/page.client", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("~/components/PageSkeleton", () => ({ PageSkeleton: () => null }));
jest.mock("nuqs/adapters/react", () => ({
  NuqsAdapter: ({ children }: { children: unknown }) => children,
}));

// Required, not imported: an import would load the modules before `db` above
// exists, and their Prisma mock would capture an uninitialised binding.
const { getEpicArc } =
  require("~/app/epic-arc/[epicArcId]/data") as typeof EpicArcData;
const route = require("~/app/epic-arc/[epicArcId]/page") as typeof EpicArcRoute;
const index = require("~/app/epic-arcs/page") as typeof EpicArcsIndex;

const ARC = {
  epicArcId: 29,
  name: "The Blood-Stained Stars",
  factionId: 500016,
  iconId: 3807,
  arcRestartInterval: 129600,
};

const step = (
  missionId: number,
  next: number[],
  agentId: number,
  overrides: Record<string, unknown> = {},
) => ({
  epicArcId: 29,
  missionId,
  agentId,
  failMissionId: missionId,
  mission: {
    name: `Mission ${missionId}`,
    killDungeonId: null,
    killObjectiveTypeId: null,
    killObjectiveQuantity: null,
    killDropItemInMissionContainerTypeId: null,
    courierObjectiveTypeId: null,
    courierObjectiveQuantity: null,
    rewardTypeId: 29,
    rewardQuantity: 100000,
    bonusRewardTypeId: null,
    bonusRewardQuantity: null,
    isDeleted: false,
    messages: [],
    ...overrides,
  },
  nextMissions: next.map((nextMissionId) => ({ nextMissionId })),
});

// 1 → 2 → (3 | 4): one choice, two endings, two agents.
const STEPS = [
  step(1, [2], 3019356, { messages: [{ text: "Quality of Mercy" }] }),
  step(2, [3, 4], 3019358),
  step(3, [], 3019356),
  step(4, [], 3019356, { rewardTypeId: null, rewardQuantity: null }),
];

const character = (characterId: number, name: string) => ({
  characterId,
  name,
  corporationId: 1000130,
  corporation: { name: "Sisters of EVE", factionId: null, faction: null },
});

beforeEach(() => {
  for (const model of Object.values(db)) {
    for (const method of Object.values(model)) {
      method.mockReset().mockResolvedValue([]);
    }
  }
  db.character.findMany.mockResolvedValue([
    character(3019356, "Sister Alitura"),
    character(3019358, "Tevis Jak"),
  ]);
  db.faction.findMany.mockResolvedValue([
    { factionId: 500016, name: "Servant Sisters of EVE" },
  ]);
});

const params = (epicArcId: string) => ({
  params: Promise.resolve({ epicArcId }),
});

describe("getEpicArc", () => {
  it("returns null for an arc that does not exist", async () => {
    expect(await getEpicArc(1)).toBeNull();
  });

  it("builds the arc in play order", async () => {
    db.epicArc.findMany.mockResolvedValue([ARC]);
    db.epicArcMission.findMany.mockResolvedValue([...STEPS].reverse());

    const arc = await getEpicArc(29);

    expect(arc?.faction?.name).toBe("Servant Sisters of EVE");
    expect(arc?.steps.map((s) => s.missionId)).toEqual([1, 2, 3, 4]);
    expect(arc?.steps[0]).toMatchObject({
      chapterTitle: "Quality of Mercy",
      rewardIsk: 100000,
      agent: expect.objectContaining({ name: "Sister Alitura" }),
    });
    expect(db.epicArc.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { epicArcId: { in: [29] }, isDeleted: false },
      }),
    );
  });
});

describe("epic arc route", () => {
  it("describes the arc by its size and endings", async () => {
    db.epicArc.findMany.mockResolvedValue([ARC]);
    db.epicArcMission.findMany.mockResolvedValue(STEPS);

    const meta = await route.generateMetadata(params("29"));

    expect(meta.title).toBe("The Blood-Stained Stars — Epic Arc");
    expect(meta.description).toBe(
      "The Blood-Stained Stars, an EVE Online epic arc for Servant Sisters of EVE: 4 missions across 2 agents, with 2 endings.",
    );
  });

  it("words a one-agent, one-ending arc with no faction in the singular", async () => {
    db.epicArc.findMany.mockResolvedValue([{ ...ARC, factionId: null }]);
    db.epicArcMission.findMany.mockResolvedValue([
      step(1, [2], 3019356),
      step(2, [], 3019356),
    ]);

    const meta = await route.generateMetadata(params("29"));

    expect(meta.description).toBe(
      "The Blood-Stained Stars, an EVE Online epic arc: 2 missions across one agent, with one ending.",
    );
  });

  it("returns no metadata for a non-canonical id, without a query", async () => {
    expect(await route.generateMetadata(params("029"))).toEqual({});
    expect(db.epicArc.findMany).not.toHaveBeenCalled();
  });

  it("404s a missing arc", async () => {
    const tree = route.default(params("1")) as ReactElement<{
      children: ReactElement;
    }>;
    const child = tree.props.children;
    await expect(
      (child.type as (p: unknown) => Promise<unknown>)(child.props),
    ).rejects.toThrow();
  });

  it("prerenders only a placeholder id the page refuses", () => {
    expect(route.generateStaticParams()).toEqual([{ epicArcId: "0" }]);
  });
});

describe("/epic-arcs index", () => {
  it("summarises every arc without shipping its steps", async () => {
    db.epicArc.findMany.mockResolvedValue([ARC]);
    db.epicArcMission.findMany.mockResolvedValue(STEPS);

    const element = (await index.default()) as ReactElement<{
      arcs: unknown[];
    }>;

    expect(element.props.arcs).toEqual([
      expect.objectContaining({
        epicArcId: 29,
        factionName: "Servant Sisters of EVE",
        missionCount: 4,
        agentCount: 2,
        chapterCount: 1,
        choiceCount: 1,
        endingCount: 2,
        totalIsk: 300000,
        startAgents: [expect.objectContaining({ name: "Sister Alitura" })],
      }),
    ]);
    expect(element.props.arcs[0]).not.toHaveProperty("steps");
    expect(db.epicArc.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDeleted: false } }),
    );
  });

  it("lists every start, counts time bonuses and drops deleted missions", async () => {
    db.epicArc.findMany.mockResolvedValue([ARC]);
    // Two starts (1 and 2) with different agents; step 2 pays a time bonus;
    // step 5's mission was deleted, so it is no step at all.
    db.epicArcMission.findMany.mockResolvedValue([
      step(1, [3], 3019356),
      step(2, [3], 3019358, {
        bonusRewardTypeId: 29,
        bonusRewardQuantity: 5000,
      }),
      step(3, [], 3019356),
      step(5, [], 3019356, { isDeleted: true }),
    ]);

    const element = (await index.default()) as ReactElement<{
      arcs: { startAgents: { name: string }[]; totalIsk: number }[];
    }>;
    const [row] = element.props.arcs;

    expect(row?.startAgents.map((a) => a.name)).toEqual([
      "Sister Alitura",
      "Tevis Jak",
    ]);
    expect(row).toMatchObject({ missionCount: 3, totalIsk: 305000 });
  });
});
