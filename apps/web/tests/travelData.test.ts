import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// data.ts reads the New Eden solar-system graph from the DB-backed prisma
// client; stub it so we can drive getSolarSystems / getTravelPageData
// deterministically. `next/cache` is globally stubbed (jest.config
// moduleNameMapper), so the "use cache" directive is a no-op here.
// ---------------------------------------------------------------------------
const mockFindMany = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    solarSystem: { findMany: (...args: unknown[]) => mockFindMany(...args) },
  },
}));

// A tiny slice of New Eden. New Caldari has two stargates but one is severed
// (DestinationStargate: null), so both branches of the neighbor mapping run.
const dbRows = [
  {
    solarSystemId: 30000001,
    name: "Alpha",
    securityStatus: { toNumber: () => 0.9 },
    stargates: [{ DestinationStargate: { solarSystemId: 30000002 } }],
  },
  {
    solarSystemId: 30000002,
    name: "New Caldari",
    securityStatus: { toNumber: () => 0.3 },
    stargates: [
      { DestinationStargate: { solarSystemId: 30000001 } },
      { DestinationStargate: null },
    ],
  },
];

function loadData() {
  return require("~/app/travel/[[...waypoints]]/data");
}

describe("travel data loader", () => {
  beforeEach(() => {
    mockFindMany.mockReset().mockResolvedValue(dbRows);
  });

  describe("getSolarSystems", () => {
    it("maps DB rows into the client-facing solar-system graph", async () => {
      const { getSolarSystems } = loadData();
      const solarSystems = await getSolarSystems();

      expect(solarSystems[30000001]).toEqual({
        name: "Alpha",
        securityStatus: 0.9,
        neighbors: [30000002],
      });
    });

    it("drops stargates with no destination when building neighbors", async () => {
      const { getSolarSystems } = loadData();
      const solarSystems = await getSolarSystems();

      // New Caldari has two stargates but only one leads somewhere.
      expect(solarSystems[30000002].neighbors).toEqual([30000001]);
    });
  });

  describe("parseInitialWaypoints", () => {
    const solarSystems = {
      "30000001": { name: "Alpha", securityStatus: 0.9, neighbors: [30000002] },
      "30000002": {
        name: "New Caldari",
        securityStatus: 0.3,
        neighbors: [30000001],
      },
    };

    it("returns an empty list when there are no waypoints", () => {
      const { parseInitialWaypoints } = loadData();
      expect(parseInitialWaypoints(solarSystems, undefined)).toEqual([]);
    });

    it("resolves a waypoint by solar-system id", () => {
      const { parseInitialWaypoints } = loadData();
      expect(parseInitialWaypoints(solarSystems, ["30000001"])).toEqual([
        "30000001",
      ]);
    });

    it("resolves a name case-insensitively, with underscores as spaces", () => {
      const { parseInitialWaypoints } = loadData();
      expect(parseInitialWaypoints(solarSystems, ["new_caldari"])).toEqual([
        "30000002",
      ]);
    });

    it("drops unknown waypoints", () => {
      const { parseInitialWaypoints } = loadData();
      expect(parseInitialWaypoints(solarSystems, ["Alpha", "Nowhere"])).toEqual(
        ["30000001"],
      );
    });
  });

  describe("getTravelPageData", () => {
    it("returns the graph plus the resolved initial waypoints", async () => {
      const { getTravelPageData } = loadData();
      const { solarSystems, initialWaypoints } = await getTravelPageData([
        "Alpha",
      ]);

      expect(Object.keys(solarSystems)).toHaveLength(2);
      expect(initialWaypoints).toEqual(["30000001"]);
    });
  });
});
