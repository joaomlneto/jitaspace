import { describe, expect, it } from "@jest/globals";

import type { SovereigntySystemsSolarsystem } from "@jitaspace/esi-client";

import type { SovereigntyRow } from "../helpers/planSovereigntyUpdates";
import {
  planSovereigntyUpdates,
  toSovereigntyRow,
} from "../helpers/planSovereigntyUpdates";

const allianceClaim = (
  solarSystemId: number,
  allianceId: number,
  overrides: { start?: string; adm?: number; noWindow?: boolean } = {},
): SovereigntySystemsSolarsystem => ({
  solar_system_id: solarSystemId,
  claim: {
    alliance: {
      alliance_id: allianceId,
      corporation_id: 98599770,
      claimed_since: "2020-10-08T00:38:16Z",
      is_capital_system: false,
      sovereignty_hub: {
        id: 1034510825648,
        ...(overrides.noWindow
          ? {}
          : {
              vulnerability_window: {
                start: overrides.start ?? "2026-10-06T09:30:00Z",
                end: "2026-10-06T12:30:00Z",
              },
            }),
      },
      development: {
        activity_defense_multiplier: overrides.adm ?? 6,
        military_level: 5,
        industrial_level: 4,
        strategic_level: 3,
      },
    },
  },
});

const row = (system: SovereigntySystemsSolarsystem): SovereigntyRow =>
  toSovereigntyRow(system);

describe("toSovereigntyRow", () => {
  it("keeps every field of an alliance claim", () => {
    expect(row(allianceClaim(30000208, 99003581))).toEqual({
      solarSystemId: 30000208,
      isUnclaimed: false,
      factionId: null,
      allianceId: 99003581,
      corporationId: 98599770,
      claimedSince: new Date("2020-10-08T00:38:16Z"),
      isCapitalSystem: false,
      sovereigntyHubId: 1034510825648n,
      vulnerabilityWindowStart: new Date("2026-10-06T09:30:00Z"),
      vulnerabilityWindowEnd: new Date("2026-10-06T12:30:00Z"),
      activityDefenseMultiplier: 6,
      militaryLevel: 5,
      industrialLevel: 4,
      strategicLevel: 3,
    });
  });

  it("leaves the window empty while the hub is in a campaign", () => {
    const result = row(allianceClaim(1, 2, { noWindow: true }));
    expect(result.vulnerabilityWindowStart).toBeNull();
    expect(result.vulnerabilityWindowEnd).toBeNull();
  });

  it("maps faction and unclaimed systems", () => {
    expect(
      row({
        solar_system_id: 30000001,
        claim: { faction: { faction_id: 500007 } },
      }),
    ).toMatchObject({
      solarSystemId: 30000001,
      factionId: 500007,
      allianceId: null,
      isUnclaimed: false,
      sovereigntyHubId: null,
    });
    expect(
      row({ solar_system_id: 30000326, claim: { unclaimed: true } }),
    ).toMatchObject({
      solarSystemId: 30000326,
      isUnclaimed: true,
      factionId: null,
      allianceId: null,
    });
  });
});

describe("planSovereigntyUpdates", () => {
  const known = (...ids: number[]) => new Set(ids);

  it("does nothing when the database matches ESI", () => {
    const esi = [row(allianceClaim(1, 10))];
    const plan = planSovereigntyUpdates({
      esiSystems: esi,
      // a fresh copy: equal values, distinct Date and BigInt instances
      dbSystems: [row(allianceClaim(1, 10))],
      knownSolarSystemIds: known(1),
      knownAllianceIds: known(10),
    });

    expect(plan).toEqual({
      created: [],
      changed: [],
      removedSolarSystemIds: [],
      skipped: [],
      affectedAllianceIds: [],
    });
  });

  it("writes development and window changes without evicting the holder", () => {
    const plan = planSovereigntyUpdates({
      esiSystems: [
        row(allianceClaim(1, 10, { adm: 5.4 })),
        row(allianceClaim(2, 10, { start: "2026-10-07T09:30:00Z" })),
      ],
      dbSystems: [row(allianceClaim(1, 10)), row(allianceClaim(2, 10))],
      knownSolarSystemIds: known(1, 2),
      knownAllianceIds: known(10),
    });

    expect(plan.changed.map((r) => r.solarSystemId)).toEqual([1, 2]);
    expect(plan.affectedAllianceIds).toEqual([]);
  });

  it("evicts both sides when a system changes hands, is taken or is lost", () => {
    const plan = planSovereigntyUpdates({
      esiSystems: [
        row(allianceClaim(1, 20)), // taken from 10 by 20
        row(allianceClaim(2, 30)), // newly listed, held by 30
        row({ solar_system_id: 3, claim: { unclaimed: true } }), // 40 lost it
      ],
      dbSystems: [
        row(allianceClaim(1, 10)),
        row(allianceClaim(3, 40)),
        row(allianceClaim(4, 50)), // no longer listed at all
      ],
      knownSolarSystemIds: known(1, 2, 3),
      knownAllianceIds: known(20, 30),
    });

    expect(plan.created.map((r) => r.solarSystemId)).toEqual([2]);
    expect(plan.changed.map((r) => r.solarSystemId)).toEqual([1, 3]);
    expect(plan.removedSolarSystemIds).toEqual([4]);
    expect(plan.affectedAllianceIds.sort((a, b) => a - b)).toEqual([
      10, 20, 30, 40, 50,
    ]);
  });

  it("skips claims on unknown systems or by unknown alliances, and keeps their rows", () => {
    const plan = planSovereigntyUpdates({
      esiSystems: [
        row(allianceClaim(1, 10)), // system not in our SDE tables
        row(allianceClaim(2, 99)), // alliance not in the Alliance table
      ],
      dbSystems: [row(allianceClaim(2, 10))],
      knownSolarSystemIds: known(2),
      knownAllianceIds: known(10),
    });

    expect(plan.skipped.map((r) => r.solarSystemId)).toEqual([1, 2]);
    expect(plan.created).toEqual([]);
    expect(plan.changed).toEqual([]);
    // still listed by ESI, so not removed
    expect(plan.removedSolarSystemIds).toEqual([]);
  });
});
