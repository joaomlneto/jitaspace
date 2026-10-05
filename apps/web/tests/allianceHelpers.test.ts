/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import type {
  AllianceCorporation,
  AllianceSovereigntySystem,
} from "~/app/alliance/[allianceId]/types";
import {
  buildCorporationRows,
  summarizeCorporations,
} from "~/app/alliance/[allianceId]/corporations";
import { formatAge } from "~/app/alliance/[allianceId]/format";
import { summarizeSovereignty } from "~/app/alliance/[allianceId]/sovereignty";
import { splitAllianceProfile } from "~/app/alliance/[allianceId]/split";
import { isAlliancePageTab } from "~/app/alliance/[allianceId]/tabs";
import {
  activityGrid,
  iskEfficiency,
  locationBreakdown,
  recentMonths,
  timezoneBreakdown,
  topAllTime,
  topGroups,
} from "~/app/alliance/[allianceId]/zkillboard";

const corporation = (
  overrides: Partial<AllianceCorporation>,
): AllianceCorporation => ({
  corporationId: 1,
  name: "Corp",
  ticker: "C",
  memberCount: 0,
  ceoId: null,
  ceoName: null,
  dateFounded: null,
  taxRate: 0,
  warEligible: null,
  enlistedFactionId: null,
  homeStationId: null,
  homeStationName: null,
  url: null,
  ...overrides,
});

const system = (
  overrides: Partial<AllianceSovereigntySystem>,
): AllianceSovereigntySystem => ({
  solarSystemId: 1,
  name: "S",
  securityStatus: -0.5,
  constellationId: 1,
  constellationName: "C",
  regionId: 1,
  regionName: "R",
  corporationId: null,
  claimedSince: null,
  isCapitalSystem: false,
  sovereigntyHubId: null,
  vulnerabilityWindowStart: null,
  vulnerabilityWindowEnd: null,
  activityDefenseMultiplier: null,
  militaryLevel: null,
  industrialLevel: null,
  strategicLevel: null,
  ...overrides,
});

describe("member corporations", () => {
  const rows = buildCorporationRows({
    corporations: [
      corporation({
        corporationId: 1,
        memberCount: 30,
        taxRate: 0.1,
        warEligible: true,
        dateFounded: "2015-01-01T00:00:00Z",
        enlistedFactionId: 500001,
      }),
      corporation({
        corporationId: 2,
        memberCount: 10,
        taxRate: 0.5,
        warEligible: false,
        dateFounded: "2010-01-01T00:00:00Z",
      }),
    ],
    esiMemberIds: [1, 2, 3],
    executorCorporationId: 1,
    creatorCorporationId: 3,
  });

  it("adds the corporations ESI lists that we have not stored", () => {
    expect(rows.map((row) => row.corporationId)).toEqual([1, 2, 3]);
    expect(rows[0]).toMatchObject({ share: 0.75, isExecutor: true });
    expect(rows[2]).toMatchObject({
      name: null,
      memberCount: null,
      isCreator: true,
    });
  });

  it("summarizes membership", () => {
    const summary = summarizeCorporations(rows);
    expect(summary).toMatchObject({
      corporations: 3,
      pilots: 40,
      averagePilots: 20,
      executorShare: 0.75,
      warEligible: 1,
      enlisted: 1,
    });
    // (30 × 10% + 10 × 50%) / 40 pilots.
    expect(summary.pilotWeightedTaxRate).toBeCloseTo(0.2);
    expect(summary.largest?.corporationId).toBe(1);
    expect(summary.oldest?.corporationId).toBe(2);
    expect(summary.newest?.corporationId).toBe(1);
  });

  it("summarizes an empty alliance without dividing by zero", () => {
    expect(summarizeCorporations([])).toMatchObject({
      pilots: 0,
      averagePilots: null,
      largest: null,
      executorShare: null,
      pilotWeightedTaxRate: null,
      oldest: null,
    });
  });
});

describe("summarizeSovereignty", () => {
  it("groups systems by region, busiest first", () => {
    const summary = summarizeSovereignty([
      system({ solarSystemId: 1, regionId: 1, regionName: "Delve" }),
      system({
        solarSystemId: 2,
        regionId: 2,
        regionName: "Querious",
        constellationId: 2,
        isCapitalSystem: true,
        activityDefenseMultiplier: 2,
        sovereigntyHubId: "1",
        claimedSince: "2020-01-01T00:00:00Z",
      }),
      system({
        solarSystemId: 3,
        regionId: 2,
        regionName: "Querious",
        constellationId: 3,
        activityDefenseMultiplier: 4,
        claimedSince: "2018-01-01T00:00:00Z",
      }),
    ]);
    expect(summary.regions.map((region) => region.regionName)).toEqual([
      "Querious",
      "Delve",
    ]);
    expect(summary.regions[0]).toMatchObject({
      systems: 2,
      constellations: 2,
      hasCapital: true,
    });
    expect(summary).toMatchObject({
      systems: 3,
      constellations: 3,
      hubs: 1,
      averageAdm: 3,
      maxAdm: 4,
    });
    expect(summary.capital?.solarSystemId).toBe(2);
    expect(summary.oldestClaim?.solarSystemId).toBe(3);
  });

  it("is empty without systems", () => {
    expect(summarizeSovereignty([])).toMatchObject({
      systems: 0,
      regions: [],
      capital: null,
      averageAdm: null,
      maxAdm: null,
      oldestClaim: null,
    });
  });
});

describe("zKillboard helpers", () => {
  it("computes ISK efficiency", () => {
    expect(iskEfficiency(75, 25)).toBe(0.75);
    expect(iskEfficiency(undefined, undefined)).toBeNull();
  });

  it("keeps the latest months, oldest first", () => {
    const months = recentMonths(
      {
        "202612": { year: 2026, month: 12, shipsDestroyed: 3 },
        "202601": { year: 2026, month: 1, shipsLost: 2 },
        "202511": { year: 2025, month: 11 },
      },
      2,
    );
    expect(months).toEqual([
      { month: "2026-01", kills: 0, losses: 2, iskDestroyed: 0, iskLost: 0 },
      { month: "2026-12", kills: 3, losses: 0, iskDestroyed: 0, iskLost: 0 },
    ]);
  });

  it("reads location and timezone labels, skipping empty ones", () => {
    const labels = {
      "loc:highsec": { shipsDestroyed: 1 },
      "loc:lowsec": { shipsDestroyed: 0, shipsLost: 0 },
      "tz:au": { shipsLost: 4 },
    };
    expect(locationBreakdown(labels).map((row) => row.label)).toEqual([
      "High-sec",
    ]);
    expect(timezoneBreakdown(labels)).toEqual([
      { key: "tz:au", label: "AU", kills: 0, losses: 4 },
    ]);
  });

  it("builds a weekday × hour activity grid", () => {
    const grid = activityGrid({ max: 5, "0": { "3": 5, "4": 2 }, days: [] });
    expect(grid?.max).toBe(5);
    expect(grid?.cells[0]?.[3]).toBe(5);
    expect(grid?.cells[6]?.[23]).toBe(0);
    expect(activityGrid({})).toBeNull();
    expect(activityGrid(undefined)).toBeNull();
  });

  it("ranks ship groups and reads top lists", () => {
    expect(
      topGroups(
        {
          "1": { groupID: 1, shipsDestroyed: 1 },
          "2": { groupID: 2, shipsDestroyed: 5, shipsLost: 5 },
        },
        1,
      ).map((group) => group.groupId),
    ).toEqual([2]);
    expect(
      topAllTime(
        {
          topAllTime: [{ type: "ship", data: [{ kills: 1, shipTypeID: 587 }] }],
        },
        "ship",
      ),
    ).toEqual([{ kills: 1, shipTypeID: 587 }]);
    expect(topAllTime(null, "ship")).toEqual([]);
  });
});

describe("page helpers", () => {
  it("validates tab ids", () => {
    expect(isAlliancePageTab("wars")).toBe(true);
    expect(isAlliancePageTab("history")).toBe(false);
    expect(isAlliancePageTab(null)).toBe(false);
  });

  it("formats ages against the read time", () => {
    expect(formatAge("2016-10-05T12:00:00Z", "2026-10-05T12:00:00Z")).toBe(
      "10 years",
    );
  });
});

describe("splitAllianceProfile", () => {
  const base = {
    allianceId: 1,
    name: "A",
    ticker: "A",
    dateFounded: "2010-01-01T00:00:00Z",
    isClosed: false,
    creatorCorporationId: 3,
    creatorCorporationName: "Gone",
    executorCorporationId: 1,
    executorCorporationName: "Exec",
    factionId: null,
    factionName: null,
    warSummary: {
      total: 0,
      asAggressor: 0,
      asDefender: 0,
      asAlly: 0,
      ongoing: 0,
      shipsKilled: 0,
      iskDestroyed: 0,
      shipsLost: 0,
      iskLost: 0,
    },
    readAt: "2026-10-05T12:00:00Z",
  };

  it("keeps the rows out of the page and summarizes them instead", () => {
    const corporations = Array.from({ length: 10 }, (_, i) =>
      corporation({
        corporationId: i + 1,
        name: `Corp ${i + 1}`,
        memberCount: i === 9 ? 0 : 100 - i,
        ceoId: i === 0 ? 90000001 : null,
        ceoName: i === 0 ? "Boss" : null,
      }),
    );
    const { page, tables } = splitAllianceProfile({
      ...base,
      corporations,
      sovereignty: [system({ isCapitalSystem: true })],
      wars: [],
    });

    expect(tables.corporations).toBe(corporations);
    expect(page).not.toHaveProperty("corporations");
    expect(page).not.toHaveProperty("sovereignty");
    expect(page).not.toHaveProperty("wars");
    // The eight largest corporations with pilots, largest first.
    expect(page.composition.map((entry) => entry.corporationId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(page.executorCeo).toEqual({ id: 90000001, name: "Boss" });
    expect(page.creatorStillMember).toBe(true);
    expect(page.corporationSummary.corporations).toBe(10);
    expect(page.sovereigntySummary.capital?.solarSystemId).toBe(1);
    expect(page.listedWars).toBe(0);
  });

  it("knows when the executor has no CEO on record and the creator left", () => {
    const { page } = splitAllianceProfile({
      ...base,
      creatorCorporationId: 99,
      corporations: [corporation({ corporationId: 1, memberCount: 5 })],
      sovereignty: [],
      wars: [],
    });
    expect(page.executorCeo).toBeNull();
    expect(page.creatorStillMember).toBe(false);
  });
});
