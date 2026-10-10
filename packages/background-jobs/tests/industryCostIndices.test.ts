import { describe, expect, it } from "@jest/globals";

import type { CostIndexState } from "../helpers/industryCostIndices";
import {
  applyCostIndexRows,
  asIndustrySystemsResponse,
  diffCostIndexStates,
  isPartialSnapshot,
  parseEveRefSnapshotTime,
  parseIndustrySystems,
  UNLISTED,
} from "../helpers/industryCostIndices";

const AT = new Date("2026-10-10T19:46:06Z");

const system = (solarSystemId: number, indices: Record<string, number>) => ({
  solar_system_id: solarSystemId,
  cost_indices: Object.entries(indices).map(([activity, cost_index]) => ({
    activity,
    cost_index,
  })),
});

const ALL = {
  manufacturing: 0.0368,
  researching_time_efficiency: 0.0239,
  researching_material_efficiency: 0.0149,
  copying: 0.0093,
  invention: 0.0285,
  reaction: 0.0014,
};

describe("parseIndustrySystems", () => {
  it("orders each system's indices by activity", () => {
    const { state } = parseIndustrySystems([system(30000142, ALL)]);
    expect(state.get(30000142)).toEqual([
      0.0368, 0.0239, 0.0149, 0.0093, 0.0285, 0.0014,
    ]);
  });

  it("leaves an activity ESI did not list null", () => {
    const { state } = parseIndustrySystems([
      system(30000142, { manufacturing: 0.05 }),
    ]);
    expect(state.get(30000142)).toEqual([0.05, null, null, null, null, null]);
  });

  it("counts activities it has no column for", () => {
    const { unknownActivities } = parseIndustrySystems([
      system(1, { manufacturing: 0.1, duplicating: 0.2 }),
      system(2, { duplicating: 0.3 }),
    ]);
    expect(unknownActivities).toEqual({ duplicating: 2 });
  });

  it("reports a system listed twice and keeps the last listing", () => {
    const { state, duplicateSystemIds } = parseIndustrySystems([
      system(1, { manufacturing: 0.1 }),
      system(1, { manufacturing: 0.2 }),
    ]);
    expect(duplicateSystemIds).toEqual([1]);
    expect(state.get(1)?.[0]).toBe(0.2);
  });
});

describe("diffCostIndexStates", () => {
  const previous: CostIndexState = new Map([
    [1, [0.1, 0.1, 0.1, 0.1, 0.1, 0.1]],
    [2, [0.2, 0.2, 0.2, 0.2, 0.2, 0.2]],
    [3, [0.3, 0.3, 0.3, 0.3, 0.3, 0.3]],
  ]);

  it("writes nothing when nothing changed", () => {
    expect(diffCostIndexStates(previous, new Map(previous), AT)).toEqual([]);
  });

  it("writes a changed system with all six values", () => {
    const current = new Map(previous);
    current.set(2, [0.2, 0.25, 0.2, 0.2, 0.2, 0.2]);
    expect(diffCostIndexStates(previous, current, AT)).toEqual([
      {
        solarSystemId: 2,
        validFrom: AT,
        manufacturing: 0.2,
        researchingTimeEfficiency: 0.25,
        researchingMaterialEfficiency: 0.2,
        copying: 0.2,
        invention: 0.2,
        reaction: 0.2,
      },
    ]);
  });

  it("writes a new system, and an all-null row for one no longer listed", () => {
    const current = new Map(previous);
    current.delete(3);
    current.set(4, [0.4, 0.4, 0.4, 0.4, 0.4, 0.4]);
    const rows = diffCostIndexStates(previous, current, AT);
    expect(rows.map((row) => [row.solarSystemId, row.manufacturing])).toEqual([
      [4, 0.4],
      [3, null],
    ]);
    expect(rows[1]).toMatchObject({
      researchingTimeEfficiency: null,
      reaction: null,
    });
  });

  it("does not write a new system listed with no known activity", () => {
    const current = new Map(previous);
    current.set(5, UNLISTED);
    expect(diffCostIndexStates(previous, current, AT)).toEqual([]);
  });

  it("compares values exactly, as stored", () => {
    const current = new Map(previous);
    // Older years carry full doubles: one ulp apart is a change.
    current.set(1, [0.1000000000000001, 0.1, 0.1, 0.1, 0.1, 0.1]);
    expect(diffCostIndexStates(previous, current, AT)).toHaveLength(1);
  });
});

describe("applyCostIndexRows", () => {
  it("yields the state the rows describe, dropping unlisted systems", () => {
    const previous: CostIndexState = new Map([
      [1, [0.1, 0.1, 0.1, 0.1, 0.1, 0.1]],
      [3, [0.3, 0.3, 0.3, 0.3, 0.3, 0.3]],
    ]);
    const current: CostIndexState = new Map([
      [1, [0.15, 0.1, 0.1, 0.1, 0.1, 0.1]],
      [4, [0.4, 0.4, 0.4, 0.4, 0.4, 0.4]],
    ]);
    const next = applyCostIndexRows(
      previous,
      diffCostIndexStates(previous, current, AT),
    );
    expect(next).toEqual(current);
    // The input is left alone.
    expect(previous.get(3)).toBeDefined();
  });
});

describe("isPartialSnapshot", () => {
  const full: CostIndexState = new Map(
    Array.from({ length: 100 }, (_, i) => [i, UNLISTED] as const),
  );

  it("accepts a response about as long as the last", () => {
    expect(isPartialSnapshot(full, new Map([...full].slice(0, 95)))).toBe(
      false,
    );
  });

  it("rejects one listing far fewer systems", () => {
    expect(isPartialSnapshot(full, new Map([...full].slice(0, 50)))).toBe(true);
    expect(isPartialSnapshot(full, new Map())).toBe(true);
  });

  it("accepts anything against an empty state", () => {
    expect(isPartialSnapshot(new Map(), new Map())).toBe(false);
  });
});

describe("asIndustrySystemsResponse", () => {
  it("accepts a response", () => {
    const response = [system(1, ALL)];
    expect(asIndustrySystemsResponse(response)).toBe(response);
    expect(asIndustrySystemsResponse([])).toEqual([]);
  });

  it.each([
    ["an error page", "<html>502 Bad Gateway</html>"],
    ["an error object", { error: "Internal Server Error" }],
    ["a malformed entry", [{ solar_system_id: "1", cost_indices: [] }]],
    ["an entry without indices", [{ solar_system_id: 1 }]],
    ["null", null],
  ])("rejects %s", (_, value) => {
    expect(asIndustrySystemsResponse(value)).toBeNull();
  });
});

describe("parseEveRefSnapshotTime", () => {
  it.each([
    [
      "industry-systems-2026-10-09_00-42-05.json.bz2",
      "2026-10-09T00:42:05.000Z",
    ],
    [
      "/industry-systems/history/2026/2026-10-09/industry-systems-2026-10-09_23-42-05.json.bz2",
      "2026-10-09T23:42:05.000Z",
    ],
    [
      "industry-systems-2019/systemcost_2019-01-07T08:15:03.json",
      "2019-01-07T08:15:03.000Z",
    ],
  ])("reads %s as UTC", (name, iso) => {
    expect(parseEveRefSnapshotTime(name)?.toISOString()).toBe(iso);
  });

  it.each([
    "index.json",
    "industry-systems-latest.json",
    "industry-systems-2019/",
    "industry-systems-2019.tar.bz2",
  ])("ignores %s", (name) => {
    expect(parseEveRefSnapshotTime(name)).toBeNull();
  });
});
