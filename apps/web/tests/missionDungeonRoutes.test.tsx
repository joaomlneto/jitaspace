/**
 * @jest-environment node
 */
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DungeonRoute from "~/app/dungeon/[dungeonId]/page";
import type * as MissionRoute from "~/app/mission/[missionId]/page";

// The two detail routes' server halves: their metadata, and how they tell a
// missing entity (a 404) from a bad id (a 404 without a query). The data
// readers are covered by missionDungeonData.test.ts; here they are stubbed.

const getMission = jest.fn<(id: number) => Promise<unknown>>();
const getDungeon = jest.fn<(id: number) => Promise<unknown>>();
jest.mock("~/app/mission/[missionId]/data", () => ({
  getMission: (id: number) => getMission(id),
}));
jest.mock("~/app/dungeon/[dungeonId]/data", () => ({
  getDungeon: (id: number) => getDungeon(id),
}));
jest.mock("~/app/mission/[missionId]/page.client", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("~/app/dungeon/[dungeonId]/page.client", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("~/components/PageSkeleton", () => ({ PageSkeleton: () => null }));
jest.mock("nuqs/adapters/react", () => ({
  NuqsAdapter: ({ children }: { children: unknown }) => children,
}));

const mission =
  require("~/app/mission/[missionId]/page") as typeof MissionRoute;
const dungeon =
  require("~/app/dungeon/[dungeonId]/page") as typeof DungeonRoute;

const params = <K extends string>(key: K, value: string) => ({
  params: Promise.resolve({ [key]: value } as Record<K, string>),
});

/** Resolve the async child inside the route's Suspense boundary. */
async function renderContent(
  Page: (p: never) => ReactElement<{ children: ReactElement }>,
  props: unknown,
): Promise<ReactElement<{ children: ReactElement<Record<string, unknown>> }>> {
  const child = Page(props as never).props.children;
  return (child.type as (p: unknown) => Promise<never>)(child.props);
}

const missionDetail = {
  missionId: 875,
  name: "The Guristas Spies",
  kind: "kill",
  issuer: {
    corporation: null,
    faction: { factionId: 1, name: "Caldari State" },
  },
  epicArcs: [{ name: "Arc" }],
  textValues: {},
  messages: [
    {
      key: "messages.mission.briefing",
      text: "They are in {[location]dungeonLocationID.name}.<br>Go.",
    },
  ],
};

beforeEach(() => {
  getMission.mockReset().mockResolvedValue(null);
  getDungeon.mockReset().mockResolvedValue(null);
});

describe("mission route", () => {
  it("describes a mission by its briefing, placeholders and all", async () => {
    getMission.mockResolvedValue(missionDetail);

    const meta = await mission.generateMetadata(params("missionId", "875"));

    expect(meta.title).toBe("The Guristas Spies — Mission");
    expect(meta.description).toBe("They are in [Mission Location]. Go.");
    expect(meta.alternates?.canonical).toContain("/mission/875");
  });

  it("falls back to a generic description without a briefing", async () => {
    getMission.mockResolvedValue({ ...missionDetail, messages: [] });

    const meta = await mission.generateMetadata(params("missionId", "875"));

    expect(meta.description).toContain("an EVE Online agent mission");
  });

  it("returns no metadata for a non-canonical id, without a query", async () => {
    expect(await mission.generateMetadata(params("missionId", "0875"))).toEqual(
      {},
    );
    expect(getMission).not.toHaveBeenCalled();
  });

  it("returns no metadata for a missing mission", async () => {
    expect(await mission.generateMetadata(params("missionId", "1"))).toEqual(
      {},
    );
  });

  it("prerenders only a placeholder id the page refuses", () => {
    expect(mission.generateStaticParams()).toEqual([{ missionId: "0" }]);
  });

  it("hands the mission to the client page", async () => {
    getMission.mockResolvedValue(missionDetail);

    const tree = await renderContent(
      mission.default,
      params("missionId", "875"),
    );

    expect(tree.props.children.props.mission).toBe(missionDetail);
  });

  it("404s a missing mission", async () => {
    await expect(
      renderContent(mission.default, params("missionId", "1")),
    ).rejects.toThrow();
  });

  it("lets a database failure through rather than caching a 404", async () => {
    getMission.mockRejectedValue(new Error("db down"));
    await expect(
      renderContent(mission.default, params("missionId", "875")),
    ).rejects.toThrow("db down");
  });
});

describe("dungeon route", () => {
  const described = {
    dungeonId: 43,
    described: true,
    name: "Pith Merchant Depot",
    description: "<P>A supply depot.</P>",
    gameplayDescription: null,
    archetype: { archetypeId: 24, title: "Combat Sites", description: null },
    faction: { factionId: 500011, name: "Guristas Pirates" },
    missions: [],
  };

  it("describes a dungeon by its own description", async () => {
    getDungeon.mockResolvedValue(described);

    const meta = await dungeon.generateMetadata(params("dungeonId", "43"));

    expect(meta.title).toBe("Pith Merchant Depot — Dungeon");
    expect(meta.description).toBe("A supply depot.");
  });

  it("names an undescribed dungeon by its id", async () => {
    getDungeon.mockResolvedValue({
      ...described,
      dungeonId: 213,
      described: false,
      name: null,
      description: null,
      archetype: null,
      faction: null,
      missions: [{}],
    });

    const meta = await dungeon.generateMetadata(params("dungeonId", "213"));

    expect(meta.title).toBe("Dungeon 213 — Dungeon");
    expect(meta.description).toBe(
      "EVE Online dungeon 213 — the mission and agents that use it.",
    );
  });

  it("returns no metadata for a non-canonical id, without a query", async () => {
    expect(await dungeon.generateMetadata(params("dungeonId", "x"))).toEqual(
      {},
    );
    expect(getDungeon).not.toHaveBeenCalled();
  });

  it("hands the dungeon to the client page, and 404s a missing one", async () => {
    getDungeon.mockResolvedValueOnce(described);
    const tree = await renderContent(
      dungeon.default,
      params("dungeonId", "43"),
    );
    expect(tree.props.children.props.dungeon).toBe(described);

    await expect(
      renderContent(dungeon.default, params("dungeonId", "1")),
    ).rejects.toThrow();
    expect(dungeon.generateStaticParams()).toEqual([{ dungeonId: "0" }]);
  });
});
