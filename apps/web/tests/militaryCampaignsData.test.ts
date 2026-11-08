import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DataModule from "~/app/military-campaigns/data";

// next/cache is stubbed globally (moduleNameMapper), so "use cache" and
// cacheSdeRead() are inert here and the read runs against these stubs.
const mockCampaigns = jest.fn<() => Promise<unknown[]>>();
const mockObjectives = jest.fn<() => Promise<unknown[]>>();
const mockFactions = jest.fn<(args: unknown) => Promise<unknown[]>>();
jest.mock("~/lib/db", () => ({
  prisma: {
    militaryCampaign: { findMany: () => mockCampaigns() },
    militaryCampaignObjective: { findMany: () => mockObjectives() },
    faction: { findMany: (args: unknown) => mockFactions(args) },
  },
}));

const { readMilitaryCampaignsSdeInfo } =
  require("~/app/military-campaigns/data") as typeof DataModule;

describe("readMilitaryCampaignsSdeInfo", () => {
  beforeEach(() => {
    mockCampaigns.mockReset();
    mockObjectives.mockReset();
    mockFactions.mockReset();
  });

  it("keys campaigns and objectives by UUID, names the issuer, and turns BigInts into numbers", async () => {
    mockCampaigns.mockResolvedValue([
      {
        militaryCampaignId: "camp-1",
        title: "State Corridor Initiative",
        subtitle: null,
        targetProgress: 30n,
        issuerFactionId: 500001,
      },
      {
        militaryCampaignId: "camp-2",
        title: "Unissued",
        subtitle: "s",
        targetProgress: null,
        issuerFactionId: null,
      },
    ]);
    mockObjectives.mockResolvedValue([
      {
        militaryCampaignObjectiveId: "obj-1",
        title: "Mine <b>Veldspar</b>",
        subtitle: null,
        // An ISK-denominated target, past int4.
        targetProgress: 6_000_000_000n,
        contributionMethodName: "MineOre",
      },
    ]);
    mockFactions.mockResolvedValue([
      { factionId: 500001, name: "Caldari State" },
    ]);

    const info = await readMilitaryCampaignsSdeInfo();

    expect(info.campaigns["camp-1"]).toEqual({
      title: "State Corridor Initiative",
      subtitle: null,
      targetProgress: 30,
      issuerFactionId: 500001,
      issuerFactionName: "Caldari State",
    });
    expect(info.campaigns["camp-2"]?.issuerFactionName).toBeNull();
    expect(info.objectives["obj-1"]?.targetProgress).toBe(6_000_000_000);
    // Titles land in headings and cells, so their markup is dropped.
    expect(info.objectives["obj-1"]?.title).toBe("Mine Veldspar");
    expect(mockFactions).toHaveBeenCalledWith(
      expect.objectContaining({ where: { factionId: { in: [500001] } } }),
    );
  });

  it("skips the faction query when no campaign names an issuer", async () => {
    mockCampaigns.mockResolvedValue([]);
    mockObjectives.mockResolvedValue([]);

    const info = await readMilitaryCampaignsSdeInfo();

    expect(info).toEqual({ campaigns: {}, objectives: {} });
    expect(mockFactions).not.toHaveBeenCalled();
  });

  it("lets a database failure throw, so the page degrades outside the cache", async () => {
    mockCampaigns.mockRejectedValue(new Error("connection refused"));
    mockObjectives.mockResolvedValue([]);

    await expect(readMilitaryCampaignsSdeInfo()).rejects.toThrow(
      "connection refused",
    );
  });
});
