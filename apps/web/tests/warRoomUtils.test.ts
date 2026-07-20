import { describe, expect, it } from "@jest/globals";

import type { WarRoomWar } from "~/components/Wars/WarRoom/types";
import {
  allyCount,
  filterWars,
  formatCompactNumber,
  formatDuration,
  formatIskCompact,
  leadingSide,
  SORT_OPTIONS,
  sortWars,
  STATUS_FILTERS,
  STATUS_LABEL,
  warHasCombat,
} from "~/components/Wars/WarRoom/utils";

const DAY = 86_400_000;

function war(overrides: Partial<WarRoomWar> = {}): WarRoomWar {
  const now = new Date().toISOString();
  return {
    warId: 1,
    aggressorIskDestroyed: 0,
    aggressorShipsKilled: 0,
    defenderIskDestroyed: 0,
    defenderShipsKilled: 0,
    allianceAllies: [],
    corporationAllies: [],
    declaredDate: now,
    isMutual: false,
    isOpenForAllies: false,
    updatedAt: now,
    status: "active",
    totalIskDestroyed: 0,
    totalShipsKilled: 0,
    ageDays: 0,
    aggressorIskShare: null,
    ...overrides,
  };
}

describe("formatIskCompact", () => {
  it("formats across magnitudes and trims trailing zeros", () => {
    expect(formatIskCompact(0)).toBe("0");
    expect(formatIskCompact(999)).toBe("999");
    expect(formatIskCompact(1_000)).toBe("1K");
    expect(formatIskCompact(1_500)).toBe("1.5K");
    expect(formatIskCompact(1_000_000)).toBe("1M");
    expect(formatIskCompact(48_200_000_000)).toBe("48.2B");
    expect(formatIskCompact(2_000_000_000)).toBe("2B");
    expect(formatIskCompact(1_000_000_000_000)).toBe("1T");
  });

  it("handles negative values", () => {
    expect(formatIskCompact(-5_000)).toBe("-5K");
  });
});

describe("formatCompactNumber", () => {
  it("rounds and adds thousands separators", () => {
    expect(formatCompactNumber(1234.6)).toBe("1,235");
    expect(formatCompactNumber(0)).toBe("0");
  });
});

describe("formatDuration", () => {
  it("covers zero, sub-day, whole-day and day+hour cases", () => {
    expect(formatDuration(0)).toBe("—");
    expect(formatDuration(-3)).toBe("—");
    expect(formatDuration(0.25)).toBe("6h");
    expect(formatDuration(0.001)).toBe("1h"); // clamped to at least 1h
    expect(formatDuration(3)).toBe("3d");
    expect(formatDuration(3.5)).toBe("3d 12h");
  });
});

describe("STATUS_LABEL + option tables", () => {
  it("maps lifecycle to plain terms", () => {
    expect(STATUS_LABEL.pending).toBe("Starting");
    expect(STATUS_LABEL.active).toBe("Active");
    expect(STATUS_LABEL.retracting).toBe("Ending");
  });

  it("exposes filter and sort option tables", () => {
    expect(STATUS_FILTERS.map((o) => o.value)).toEqual([
      "all",
      "active",
      "starting",
      "ending",
    ]);
    expect(SORT_OPTIONS.map((o) => o.value)).toContain("isk");
    expect(SORT_OPTIONS).toHaveLength(5);
  });
});

describe("leadingSide", () => {
  it("returns null with no combat, null when even, else the leader", () => {
    expect(leadingSide(war({ aggressorIskShare: null }))).toBeNull();
    expect(
      leadingSide(
        war({
          aggressorIskDestroyed: 5,
          defenderIskDestroyed: 5,
          aggressorIskShare: 0.5,
        }),
      ),
    ).toBeNull();
    expect(
      leadingSide(
        war({
          aggressorIskDestroyed: 8,
          defenderIskDestroyed: 2,
          aggressorIskShare: 0.8,
        }),
      ),
    ).toBe("aggressor");
    expect(
      leadingSide(
        war({
          aggressorIskDestroyed: 2,
          defenderIskDestroyed: 8,
          aggressorIskShare: 0.2,
        }),
      ),
    ).toBe("defender");
  });
});

describe("allyCount + warHasCombat", () => {
  it("counts allies across both lists", () => {
    expect(
      allyCount(war({ allianceAllies: [1, 2], corporationAllies: [3] })),
    ).toBe(3);
    expect(allyCount(war())).toBe(0);
  });

  it("detects combat from ships or isk", () => {
    expect(warHasCombat(war())).toBe(false);
    expect(warHasCombat(war({ totalShipsKilled: 1 }))).toBe(true);
    expect(warHasCombat(war({ totalIskDestroyed: 1 }))).toBe(true);
  });
});

describe("filterWars", () => {
  const wars = [
    war({ warId: 1, status: "active", totalShipsKilled: 5, isMutual: true }),
    war({ warId: 2, status: "pending" }),
    war({ warId: 3, status: "retracting", isOpenForAllies: true }),
    war({ warId: 4, status: "active", totalIskDestroyed: 10 }),
  ];

  const ids = (list: WarRoomWar[]) => list.map((w) => w.warId).sort();

  it("filters by lifecycle status", () => {
    expect(
      ids(
        filterWars(wars, {
          status: "all",
          combat: false,
          mutual: false,
          open: false,
        }),
      ),
    ).toEqual([1, 2, 3, 4]);
    expect(
      ids(
        filterWars(wars, {
          status: "active",
          combat: false,
          mutual: false,
          open: false,
        }),
      ),
    ).toEqual([1, 4]);
    expect(
      ids(
        filterWars(wars, {
          status: "starting",
          combat: false,
          mutual: false,
          open: false,
        }),
      ),
    ).toEqual([2]);
    expect(
      ids(
        filterWars(wars, {
          status: "ending",
          combat: false,
          mutual: false,
          open: false,
        }),
      ),
    ).toEqual([3]);
  });

  it("filters by attribute toggles", () => {
    expect(
      ids(
        filterWars(wars, {
          status: "all",
          combat: true,
          mutual: false,
          open: false,
        }),
      ),
    ).toEqual([1, 4]);
    expect(
      ids(
        filterWars(wars, {
          status: "all",
          combat: false,
          mutual: true,
          open: false,
        }),
      ),
    ).toEqual([1]);
    expect(
      ids(
        filterWars(wars, {
          status: "all",
          combat: false,
          mutual: false,
          open: true,
        }),
      ),
    ).toEqual([3]);
  });
});

describe("sortWars", () => {
  const base = new Date("2026-01-01T00:00:00Z").getTime();
  const wars = [
    war({
      warId: 1,
      totalIskDestroyed: 10,
      totalShipsKilled: 1,
      ageDays: 5,
      allianceAllies: [1],
      declaredDate: new Date(base).toISOString(),
    }),
    war({
      warId: 2,
      totalIskDestroyed: 30,
      totalShipsKilled: 3,
      ageDays: 1,
      declaredDate: new Date(base + DAY).toISOString(),
    }),
    war({
      warId: 3,
      totalIskDestroyed: 20,
      totalShipsKilled: 9,
      ageDays: 9,
      corporationAllies: [1, 2],
      declaredDate: new Date(base + 2 * DAY).toISOString(),
    }),
  ];
  const order = (key: Parameters<typeof sortWars>[1], dir?: -1 | 1) =>
    sortWars(wars, key, dir).map((w) => w.warId);

  it("sorts descending by default for each key", () => {
    expect(order("isk")).toEqual([2, 3, 1]);
    expect(order("ships")).toEqual([3, 2, 1]);
    expect(order("longest")).toEqual([3, 1, 2]);
    expect(order("newest")).toEqual([3, 2, 1]);
    expect(order("allies")).toEqual([3, 1, 2]);
  });

  it("reverses when direction is ascending and does not mutate input", () => {
    expect(order("isk", 1)).toEqual([1, 3, 2]);
    expect(wars.map((w) => w.warId)).toEqual([1, 2, 3]);
  });

  it("breaks ties on total ISK destroyed", () => {
    const tied = [
      war({ warId: 10, totalShipsKilled: 4, totalIskDestroyed: 5 }),
      war({ warId: 20, totalShipsKilled: 4, totalIskDestroyed: 9 }),
    ];
    expect(sortWars(tied, "ships").map((w) => w.warId)).toEqual([20, 10]);
  });
});
