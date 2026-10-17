import { describe, expect, it } from "@jest/globals";

import type {
  SovereigntyHolder,
  SovereigntyObservation,
  SovereigntyPeriod,
} from "../helpers/sovereigntyHistory";
import {
  holderFromEsi,
  holderFromMap,
  isKSpaceSolarSystemId,
  observationFromMap,
  SovereigntyHistory,
} from "../helpers/sovereigntyHistory";

const t = (iso: string) => new Date(`${iso}Z`);

const alliance = (
  allianceId: number,
  extra: Partial<SovereigntyHolder> = {},
): SovereigntyHolder => ({
  isUnclaimed: false,
  allianceId,
  corporationId: allianceId * 10,
  factionId: null,
  claimedSince: null,
  sovereigntyHubId: null,
  ...extra,
});

const faction = (factionId: number): SovereigntyHolder => ({
  isUnclaimed: false,
  allianceId: null,
  corporationId: null,
  factionId,
  claimedSince: null,
  sovereigntyHubId: null,
});

const snapshot = (
  observedAt: string,
  systems: Record<number, SovereigntyHolder>,
  source: "esi" | "everef" = "everef",
): SovereigntyObservation => ({
  observedAt: t(observedAt),
  source,
  systems: new Map(
    Object.entries(systems).map(([id, holder]) => [Number(id), holder]),
  ),
});

const period = (
  solarSystemId: number,
  holder: SovereigntyHolder,
  startedAt: string,
  earliestStartedAt: string | null,
  endedAt: string | null = null,
): SovereigntyPeriod => ({
  solarSystemId,
  ...holder,
  startedAt: t(startedAt),
  earliestStartedAt: earliestStartedAt === null ? null : t(earliestStartedAt),
  endedAt: endedAt === null ? null : t(endedAt),
});

const empty = () =>
  new SovereigntyHistory({ openPeriods: [], latestSnapshotAt: null });

const byStart = (rows: SovereigntyPeriod[]) =>
  [...rows].sort(
    (a, b) => a.solarSystemId - b.solarSystemId || +a.startedAt - +b.startedAt,
  );

describe("converting snapshots", () => {
  it("keeps only K-space systems", () => {
    expect(isKSpaceSolarSystemId(30000142)).toBe(true);
    expect(isKSpaceSolarSystemId(30100000)).toBe(true);
    expect(isKSpaceSolarSystemId(31000005)).toBe(false);
    expect(isKSpaceSolarSystemId(32000001)).toBe(false);

    const observation = observationFromMap(
      [{ system_id: 30000001 }, { system_id: 31000001 }],
      t("2020-01-01T00:00:00"),
      "everef",
    );
    expect([...observation.systems.keys()]).toEqual([30000001]);
  });

  it("reads /sovereignty/map and /sovereignty/systems as the same holders", () => {
    expect(
      holderFromMap({
        system_id: 1,
        alliance_id: 99,
        corporation_id: 98,
      }),
    ).toEqual({ ...alliance(99), corporationId: 98 });
    expect(holderFromMap({ system_id: 1, faction_id: 500001 })).toEqual(
      faction(500001),
    );
    expect(holderFromMap({ system_id: 1 }).isUnclaimed).toBe(true);

    expect(
      holderFromEsi({
        solar_system_id: 1,
        claim: {
          alliance: {
            alliance_id: 99,
            corporation_id: 98,
            claimed_since: "2020-10-08T00:38:16Z",
            is_capital_system: false,
            sovereignty_hub: { id: 1034510825648 },
            development: {
              activity_defense_multiplier: 6,
              military_level: 5,
              industrial_level: 5,
              strategic_level: 5,
            },
          },
        },
      }),
    ).toEqual({
      ...alliance(99),
      corporationId: 98,
      claimedSince: t("2020-10-08T00:38:16"),
      sovereigntyHubId: 1034510825648n,
    });
    expect(
      holderFromEsi({
        solar_system_id: 1,
        claim: { faction: { faction_id: 500001 } },
      }),
    ).toEqual(faction(500001));
    expect(
      holderFromEsi({ solar_system_id: 1, claim: { unclaimed: true } })
        .isUnclaimed,
    ).toBe(true);
  });
});

describe("SovereigntyHistory", () => {
  it("opens a period per system on the first snapshot, with no earliest start", () => {
    const history = empty();
    history.apply(
      snapshot("2017-11-29T14:00:00", { 1: alliance(10), 2: faction(500001) }),
    );
    const changes = history.flush();

    expect(byStart(changes.upserts)).toEqual([
      period(1, alliance(10), "2017-11-29T14:00:00", null),
      period(2, faction(500001), "2017-11-29T14:00:00", null),
    ]);
    expect(changes.deletes).toEqual([]);
    expect(changes.snapshots).toEqual([
      {
        observedAt: t("2017-11-29T14:00:00"),
        source: "everef",
        systemCount: 2,
      },
    ]);
  });

  it("writes only the snapshot when nothing changed", () => {
    const history = empty();
    history.apply(snapshot("2018-01-01T00:00:00", { 1: alliance(10) }));
    history.flush();
    history.apply(snapshot("2018-01-01T01:00:00", { 1: alliance(10) }));
    const changes = history.flush();

    expect(changes.upserts).toEqual([]);
    expect(changes.deletes).toEqual([]);
    expect(changes.snapshots).toHaveLength(1);
  });

  it("ends a holder where the next one is first seen, bounded by the snapshot before", () => {
    const history = empty();
    history.apply(snapshot("2018-01-01T00:00:00", { 1: alliance(10) }));
    history.flush();
    history.apply(snapshot("2018-01-01T01:00:00", { 1: alliance(20) }));
    const changes = history.flush();

    expect(byStart(changes.upserts)).toEqual([
      period(
        1,
        alliance(10),
        "2018-01-01T00:00:00",
        null,
        "2018-01-01T01:00:00",
      ),
      period(1, alliance(20), "2018-01-01T01:00:00", "2018-01-01T00:00:00"),
    ]);
    // The ended period was stored by the first flush, so it is rewritten.
    expect(changes.deletes).toEqual([
      { solarSystemId: 1, startedAt: t("2018-01-01T00:00:00") },
    ]);
    expect(history.openPeriodCount).toBe(1);
  });

  it("treats a change of holding corporation as a new holder", () => {
    const history = empty();
    history.apply(snapshot("2018-01-01T00:00:00", { 1: alliance(10) }));
    history.apply(
      snapshot("2018-01-01T01:00:00", {
        1: { ...alliance(10), corporationId: 77 },
      }),
    );
    expect(history.flush().upserts).toHaveLength(2);
  });

  it("starts an ESI claim exactly at its claim time when that follows the previous snapshot", () => {
    const history = empty();
    history.apply(snapshot("2026-10-10T20:00:00", { 1: alliance(10) }, "esi"));
    history.apply(
      snapshot(
        "2026-10-10T20:05:00",
        {
          1: alliance(20, {
            claimedSince: t("2026-10-10T20:02:31"),
            sovereigntyHubId: 5n,
          }),
        },
        "esi",
      ),
    );
    expect(byStart(history.flush().upserts)).toEqual([
      period(
        1,
        alliance(10),
        "2026-10-10T20:00:00",
        null,
        "2026-10-10T20:02:31",
      ),
      period(
        1,
        alliance(20, {
          claimedSince: t("2026-10-10T20:02:31"),
          sovereigntyHubId: 5n,
        }),
        "2026-10-10T20:02:31",
        "2026-10-10T20:02:31",
      ),
    ]);
  });

  it("starts a claim at the snapshot when its claim time is older than the previous snapshot", () => {
    const history = empty();
    history.apply(snapshot("2026-10-10T20:00:00", { 1: alliance(10) }, "esi"));
    const seen = alliance(20, { claimedSince: t("2026-01-01T00:00:00") });
    history.apply(snapshot("2026-10-10T20:05:00", { 1: seen }, "esi"));
    expect(byStart(history.flush().upserts)[1]).toEqual(
      period(1, seen, "2026-10-10T20:05:00", "2026-10-10T20:00:00"),
    );
  });

  it("moves an imported period's start back to the claim time ESI reports, and its predecessor's end", () => {
    const history = empty();
    history.apply(snapshot("2019-01-09T10:00:00", { 1: alliance(10) }));
    // EVE Ref's archive is silent until 2021-07-01.
    history.apply(snapshot("2021-07-01T05:00:00", { 1: alliance(20) }));
    history.apply(
      snapshot(
        "2026-10-10T20:00:00",
        {
          1: alliance(20, {
            claimedSince: t("2020-10-08T00:38:16"),
            sovereigntyHubId: 5n,
          }),
        },
        "esi",
      ),
    );
    const changes = history.flush();

    expect(byStart(changes.upserts)).toEqual([
      period(
        1,
        alliance(10),
        "2019-01-09T10:00:00",
        null,
        "2020-10-08T00:38:16",
      ),
      period(
        1,
        alliance(20, {
          claimedSince: t("2020-10-08T00:38:16"),
          sovereigntyHubId: 5n,
        }),
        "2020-10-08T00:38:16",
        "2020-10-08T00:38:16",
      ),
    ]);
    expect(changes.retargets).toEqual([]);
  });

  it("asks for a stored predecessor's end to move when only the open period was loaded", () => {
    const history = new SovereigntyHistory({
      openPeriods: [
        period(1, alliance(20), "2021-07-01T05:00:00", "2019-01-09T10:00:00"),
      ],
      latestSnapshotAt: t("2026-10-10T19:40:00"),
    });
    const result = history.apply(
      snapshot(
        "2026-10-10T20:00:00",
        { 1: alliance(20, { claimedSince: t("2020-10-08T00:38:16") }) },
        "esi",
      ),
    );
    const changes = history.flush();

    expect(result).toMatchObject({
      applied: true,
      refined: 1,
      opened: 0,
      closed: 0,
    });
    expect(changes.deletes).toEqual([
      { solarSystemId: 1, startedAt: t("2021-07-01T05:00:00") },
    ]);
    expect(changes.upserts).toEqual([
      period(
        1,
        alliance(20, { claimedSince: t("2020-10-08T00:38:16") }),
        "2020-10-08T00:38:16",
        "2020-10-08T00:38:16",
      ),
    ]);
    expect(changes.retargets).toEqual([
      {
        solarSystemId: 1,
        endedAt: t("2021-07-01T05:00:00"),
        newEndedAt: t("2020-10-08T00:38:16"),
      },
    ]);
  });

  it("fills in a claim time older than the previous holder without moving the start", () => {
    const history = new SovereigntyHistory({
      openPeriods: [
        period(1, alliance(20), "2025-01-01T00:40:00", "2024-12-31T23:40:00"),
      ],
      latestSnapshotAt: t("2026-10-10T19:40:00"),
    });
    // e.g. the holding corporation changed but ESI kept the original claim time
    const seen = alliance(20, { claimedSince: t("2020-01-01T00:00:00") });
    history.apply(snapshot("2026-10-10T20:00:00", { 1: seen }, "esi"));
    const changes = history.flush();

    expect(changes.upserts).toEqual([
      period(1, seen, "2025-01-01T00:40:00", "2024-12-31T23:40:00"),
    ]);
    expect(changes.retargets).toEqual([]);
  });

  it("splits a period when ESI's claim time is later than its start: claimed again unseen", () => {
    const history = new SovereigntyHistory({
      openPeriods: [
        period(1, alliance(20), "2025-01-01T00:40:00", "2024-12-31T23:40:00"),
      ],
      latestSnapshotAt: t("2026-10-10T19:40:00"),
    });
    const seen = alliance(20, { claimedSince: t("2026-03-01T12:00:00") });
    history.apply(snapshot("2026-10-10T20:00:00", { 1: seen }, "esi"));

    expect(byStart(history.flush().upserts)).toEqual([
      period(
        1,
        alliance(20),
        "2025-01-01T00:40:00",
        "2024-12-31T23:40:00",
        "2026-03-01T12:00:00",
      ),
      period(1, seen, "2026-03-01T12:00:00", "2026-03-01T12:00:00"),
    ]);
  });

  it("splits a period when a known claim time changes: a new claim by the same alliance", () => {
    const history = empty();
    const first = alliance(10, {
      claimedSince: t("2026-01-01T00:00:00"),
      sovereigntyHubId: 1n,
    });
    const second = alliance(10, {
      claimedSince: t("2026-10-10T20:03:00"),
      sovereigntyHubId: 2n,
    });
    history.apply(snapshot("2026-10-10T20:00:00", { 1: first }, "esi"));
    history.apply(snapshot("2026-10-10T20:05:00", { 1: second }, "esi"));

    expect(byStart(history.flush().upserts)).toEqual([
      // The first snapshot ever: its claim time is exact.
      period(
        1,
        first,
        "2026-01-01T00:00:00",
        "2026-01-01T00:00:00",
        "2026-10-10T20:03:00",
      ),
      period(1, second, "2026-10-10T20:03:00", "2026-10-10T20:03:00"),
    ]);
  });

  it("keeps an ESI-dated period when an EVE Ref snapshot, which lacks claim times, sees it", () => {
    const history = empty();
    const seen = alliance(10, {
      claimedSince: t("2026-01-01T00:00:00"),
      sovereigntyHubId: 1n,
    });
    history.apply(snapshot("2026-10-10T20:00:00", { 1: seen }, "esi"));
    history.flush();
    history.apply(snapshot("2026-10-10T21:40:00", { 1: alliance(10) }));
    const changes = history.flush();

    expect(changes.upserts).toEqual([]);
    expect(changes.snapshots).toHaveLength(1);
  });

  it("refuses an EVE Ref snapshot whose data may predate the ESI poll before it", () => {
    const history = empty();
    history.apply(snapshot("2026-10-10T20:00:00", { 1: alliance(20) }, "esi"));
    history.flush();

    // Fetched 40 minutes after our poll, so it may show the hour before it,
    // when alliance 10 still held the system.
    expect(
      history.apply(snapshot("2026-10-10T20:40:00", { 1: alliance(10) })),
    ).toMatchObject({ applied: false, reason: "older-data" });
    expect(history.hasChanges).toBe(false);
    // An hour on, it can only show what came after.
    expect(
      history.apply(snapshot("2026-10-10T21:00:01", { 1: alliance(20) })),
    ).toMatchObject({ applied: true });
  });

  it("refines a start only after the previous holder's last sighting, however EVE Ref lags", () => {
    const history = empty();
    history.apply(snapshot("2026-10-04T00:40:00", { 1: alliance(10) }));
    history.apply(snapshot("2026-10-04T01:40:00", { 1: faction(500001) }));
    history.apply(snapshot("2026-10-04T02:40:00", { 1: alliance(20) }));
    // ESI dates the claim inside the hour EVE Ref's 01:40 file lagged by:
    // moving the start there would put it before the unclaimed spell began.
    const seen = alliance(20, { claimedSince: t("2026-10-04T01:20:00") });
    history.apply(snapshot("2026-10-04T03:00:00", { 1: seen }, "esi"));
    const rows = byStart(history.flush().upserts);

    expect(rows.map((r) => [r.startedAt, r.endedAt])).toEqual([
      [t("2026-10-04T00:40:00"), t("2026-10-04T01:40:00")],
      [t("2026-10-04T01:40:00"), t("2026-10-04T02:40:00")],
      [t("2026-10-04T02:40:00"), null],
    ]);
    expect(rows[2]?.claimedSince).toEqual(t("2026-10-04T01:20:00"));
  });

  it("ends the period of a system the snapshots stop listing", () => {
    // Twenty factions' systems, plus one alliance system that drops out.
    const others = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [i + 2, faction(500001)]),
    );
    const history = empty();
    history.apply(
      snapshot("2018-01-01T00:00:00", { 1: alliance(10), ...others }),
    );
    history.apply(snapshot("2018-01-01T01:00:00", others));

    expect(byStart(history.flush().upserts)[0]).toEqual(
      period(
        1,
        alliance(10),
        "2018-01-01T00:00:00",
        null,
        "2018-01-01T01:00:00",
      ),
    );
    expect(history.openPeriodCount).toBe(20);
  });

  it("takes a snapshot missing more than one system in twenty for a failed response", () => {
    const all = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [i + 1, faction(500001)]),
    );
    const missing = (count: number) =>
      Object.fromEntries(Object.entries(all).slice(count));
    const history = empty();
    history.apply(snapshot("2018-01-01T00:00:00", all));

    expect(
      history.apply(snapshot("2018-01-01T01:00:00", missing(6))),
    ).toMatchObject({ applied: false, reason: "too-few-systems" });
    expect(
      history.apply(snapshot("2018-01-01T02:00:00", missing(5))),
    ).toMatchObject({ applied: true, closed: 5 });
  });

  it("ignores snapshots that are not newer than the history, or list too few systems", () => {
    const history = empty();
    history.apply(
      snapshot("2018-01-01T01:00:00", {
        1: alliance(10),
        2: alliance(10),
        3: alliance(10),
      }),
    );
    history.flush();

    expect(
      history.apply(snapshot("2018-01-01T01:00:00", { 1: alliance(20) })),
    ).toMatchObject({
      applied: false,
      reason: "not-newer",
    });
    expect(
      history.apply(snapshot("2018-01-01T02:00:00", { 1: alliance(20) })),
    ).toMatchObject({
      applied: false,
      reason: "too-few-systems",
    });
    expect(history.hasChanges).toBe(false);
    expect(history.latestSnapshotAt).toEqual(t("2018-01-01T01:00:00"));
  });

  it("writes a period opened and refined within one flush once, under its final start", () => {
    const history = new SovereigntyHistory({
      openPeriods: [period(1, alliance(10), "2026-01-01T00:00:00", null)],
      latestSnapshotAt: t("2026-10-10T19:00:00"),
    });
    history.apply(snapshot("2026-10-10T19:40:00", { 1: alliance(20) }));
    history.apply(
      snapshot(
        "2026-10-10T20:00:00",
        { 1: alliance(20, { claimedSince: t("2026-10-10T19:12:00") }) },
        "esi",
      ),
    );
    const changes = history.flush();

    expect(byStart(changes.upserts)).toEqual([
      period(
        1,
        alliance(10),
        "2026-01-01T00:00:00",
        null,
        "2026-10-10T19:12:00",
      ),
      period(
        1,
        alliance(20, { claimedSince: t("2026-10-10T19:12:00") }),
        "2026-10-10T19:12:00",
        "2026-10-10T19:12:00",
      ),
    ]);
    // Only the loaded row is in the database; the new one never was.
    expect(changes.deletes).toEqual([
      { solarSystemId: 1, startedAt: t("2026-01-01T00:00:00") },
    ]);
    expect(changes.retargets).toEqual([]);
  });

  it("tracks what is stored across flushes", () => {
    const history = empty();
    history.apply(snapshot("2018-01-01T00:00:00", { 1: alliance(10) }));
    history.flush();
    history.apply(snapshot("2018-01-01T01:00:00", { 1: alliance(20) }));
    history.flush();
    history.apply(snapshot("2018-01-01T02:00:00", { 1: alliance(30) }));
    const changes = history.flush();

    // Only the period opened by the previous flush is rewritten now.
    expect(changes.deletes).toEqual([
      { solarSystemId: 1, startedAt: t("2018-01-01T01:00:00") },
    ]);
    expect(history.committedSnapshotAt).toEqual(t("2018-01-01T02:00:00"));
  });
});
