import { describe, expect, it } from "@jest/globals";

import type { IncursionSiteRole } from "~/app/incursions/siteRoles";
import { buildIncursionLayouts } from "~/app/incursions/layouts";

const at = (iso: string) => new Date(iso);

describe("buildIncursionLayouts", () => {
  const roles = new Map<number, IncursionSiteRole>([
    [2, "vanguard"],
    [3, "vanguard"],
    [4, "assault"],
    [5, "headquarters"],
    [9, "vanguard"],
  ]);
  const systems = [
    { solarSystemId: 2, name: "Bravo", constellationId: 100 },
    { solarSystemId: 3, name: "Alpha", constellationId: 100 },
    { solarSystemId: 4, name: "Delta", constellationId: 100 },
    { solarSystemId: 5, name: "Echo", constellationId: 100 },
    { solarSystemId: 9, name: "Kilo", constellationId: 300 },
  ];

  it("groups sites by type, by name, under the latest staging system", () => {
    const [layout] = buildIncursionLayouts({
      incursions: [
        {
          constellationId: 100,
          stagingSolarSystemId: null,
          firstSeenAt: at("2026-01-02T00:00:00Z"),
        },
        {
          constellationId: 100,
          stagingSolarSystemId: 1,
          firstSeenAt: at("2025-01-01T00:00:00Z"),
        },
        {
          constellationId: 100,
          stagingSolarSystemId: 6,
          firstSeenAt: at("2020-01-01T00:00:00Z"),
        },
      ],
      systems,
      roles,
    });
    expect(layout).toEqual({
      constellationId: 100,
      stagingSolarSystemId: 1,
      vanguard: [3, 2],
      assault: [4],
      headquarters: [5],
      incursionCount: 3,
      lastSeenAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("keeps constellations that only have incursions, or only sites", () => {
    const layouts = buildIncursionLayouts({
      incursions: [
        {
          constellationId: 200,
          stagingSolarSystemId: 7,
          firstSeenAt: at("2024-05-05T00:00:00Z"),
        },
      ],
      systems: systems.filter((s) => s.constellationId === 300),
      roles,
    });
    expect(layouts).toEqual([
      expect.objectContaining({
        constellationId: 200,
        vanguard: [],
        incursionCount: 1,
      }),
      expect.objectContaining({
        constellationId: 300,
        stagingSolarSystemId: null,
        vanguard: [9],
        incursionCount: 0,
        lastSeenAt: null,
      }),
    ]);
  });
});
