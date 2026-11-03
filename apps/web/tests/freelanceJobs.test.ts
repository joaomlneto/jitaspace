import { describe, expect, it } from "@jest/globals";

import type { FreelanceJob, FreelanceJobDetails } from "@jitaspace/hooks";

import type { FreelanceJobSource } from "~/components/Freelance/freelanceJobs";
import {
  activeFreelanceSourceKeys,
  contributionMethodLabel,
  describeParameter,
  describeParameters,
  formatProgressPercent,
  freelanceJobProgressPercent,
  freelanceJobRewardPaid,
  freelanceJobSourceKey,
  humanizeIdentifier,
  mergeFreelanceJobs,
  nextFreelanceSourceSelection,
  parameterLabel,
  parameterValueKind,
} from "~/components/Freelance/freelanceJobs";
import { parseFreelanceJobId } from "~/lib/routeParams";

const job = (id: string, over: Partial<FreelanceJob> = {}): FreelanceJob => ({
  id,
  name: `Job ${id}`,
  state: "Active",
  last_modified: "2026-10-30T00:00:00Z",
  progress: { current: 50, desired: 100 },
  reward: { initial: 1000, remaining: 400 },
  ...over,
});

const character = (subjectId: number): FreelanceJobSource => ({
  kind: "character",
  subjectId,
});
const corporation = (subjectId: number): FreelanceJobSource => ({
  kind: "corporation",
  subjectId,
});

describe("freelanceJobProgressPercent", () => {
  it.each([
    [{ current: 50, desired: 200 }, 25],
    [{ current: 0, desired: 10 }, 0],
    // Over-delivery and a zero goal both read as complete, never past it.
    [{ current: 15, desired: 10 }, 100],
    [{ current: 0, desired: 0 }, 100],
  ])("%j is %d%%", (progress, percent) => {
    expect(freelanceJobProgressPercent({ progress })).toBe(percent);
  });
});

describe("formatProgressPercent", () => {
  it.each([
    [0, "0"],
    [0.04, "0.0"],
    [0.4, "0.4"],
    [1, "1"],
    [37.9, "37"],
    // Still open, so it must not read as done.
    [99.6, "99"],
    [100, "100"],
    [140, "100"],
  ])("shows %s%% as %s", (percent, text) => {
    expect(formatProgressPercent(percent)).toBe(text);
  });
});

describe("freelanceJobRewardPaid", () => {
  it("is what was reserved minus what is left", () => {
    expect(freelanceJobRewardPaid(job("a"))).toBe(600);
  });

  it("is unknown for a job without a reward", () => {
    expect(freelanceJobRewardPaid({ reward: undefined })).toBeUndefined();
  });

  it("never goes negative", () => {
    expect(
      freelanceJobRewardPaid({ reward: { initial: 10, remaining: 12 } }),
    ).toBe(0);
  });
});

describe("labels", () => {
  it.each([
    ["DeliverItem", "Deliver item"],
    ["ScanSignatureSite", "Scan signature site"],
    ["KillNPC", "Kill NPC"],
    ["destroyed_identity", "Destroyed identity"],
    ["FWComplexType", "FW complex type"],
    ["NPCKillCount", "NPC kill count"],
    ["x", "X"],
  ])("humanizes %s as %s", (identifier, words) => {
    expect(humanizeIdentifier(identifier)).toBe(words);
  });

  it("names known methods and parameters, and humanizes the rest", () => {
    expect(contributionMethodLabel("KillNPC")).toBe("Destroy NPCs");
    expect(contributionMethodLabel("HackSomething")).toBe("Hack something");
    expect(parameterLabel("fw_complex_type")).toBe("Complex type");
    expect(parameterLabel("brand_new_thing")).toBe("Brand new thing");
  });
});

describe("parameterValueKind", () => {
  it("routes entities through their category", () => {
    expect(parameterValueKind("solarsystem")).toEqual({
      kind: "entity",
      category: "solar_system",
    });
    expect(parameterValueKind("ore_type")).toEqual({
      kind: "entity",
      category: "inventory_type",
    });
    expect(parameterValueKind("structure")).toEqual({
      kind: "entity",
      category: "structure",
    });
  });

  it("treats item groups as groups and anything else as a labelled id", () => {
    expect(parameterValueKind("ore_group")).toEqual({ kind: "group" });
    expect(parameterValueKind("ship_class")).toEqual({
      kind: "other",
      label: "Ship class",
    });
  });
});

describe("describeParameter", () => {
  it("flattens a matcher, dropping empty value lists", () => {
    expect(
      describeParameter("location", {
        matcher: {
          values: [
            { value_type: "solarsystem", values: ["30000142"] },
            { value_type: "region", values: [] },
          ],
        },
      }),
    ).toEqual({
      kind: "matcher",
      key: "location",
      label: "Location",
      groups: [{ valueType: "solarsystem", values: ["30000142"] }],
    });
  });

  it("reads an empty matcher as matching anything", () => {
    const described = describeParameter("destroyed_ship", {
      matcher: { values: [] },
    });
    expect(described).toMatchObject({ kind: "matcher", groups: [] });
  });

  it("reads options, booleans and deliveries", () => {
    expect(
      describeParameter("who", { options: { selected: ["self", "corp"] } }),
    ).toMatchObject({ kind: "options", selected: ["self", "corp"] });
    expect(
      describeParameter("cover_implants", { boolean: { value: true } }),
    ).toMatchObject({ kind: "boolean", label: "Covers implants", value: true });
    expect(
      describeParameter("corporation_item_delivery", {
        corporation_item_delivery: {
          item_type: {
            values: [{ value_type: "item_type", values: ["34"] }],
          },
          corporation_office_location: {
            values: [{ value_type: "station", values: ["60003760"] }],
          },
        },
      }),
    ).toEqual({
      kind: "delivery",
      key: "corporation_item_delivery",
      label: "Delivery",
      items: [{ valueType: "item_type", values: ["34"] }],
      locations: [{ valueType: "station", values: ["60003760"] }],
    });
  });

  it("does not guess at a shape it does not know", () => {
    expect(describeParameter("mystery", {})).toEqual({
      kind: "unknown",
      key: "mystery",
      label: "Mystery",
    });
  });
});

describe("describeParameters", () => {
  it("lists what to do before where to do it", () => {
    const configuration: FreelanceJobDetails["configuration"] = {
      method: "KillCapsuleer",
      version: 1,
      parameters: {
        location: { matcher: { values: [] } },
        destroyed_ship: { matcher: { values: [] } },
        destroyed_identity: { matcher: { values: [] } },
      },
    };
    expect(describeParameters(configuration).map((p) => p.key)).toEqual([
      "destroyed_identity",
      "destroyed_ship",
      "location",
    ]);
  });
});

describe("mergeFreelanceJobs", () => {
  it("lists a job once, with every source that lists it", () => {
    const rows = mergeFreelanceJobs([
      { source: character(1), jobs: [job("a"), job("b")] },
      { source: character(2), jobs: [job("a")] },
      { source: corporation(500), jobs: [job("a"), job("c")] },
    ]);

    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(rows[0]?.sources.map(freelanceJobSourceKey)).toEqual([
      "character:1",
      "character:2",
      "corporation:500",
    ]);
  });

  it("shows the most recently modified copy of a job", () => {
    const stale = job("a", {
      last_modified: "2026-10-29T00:00:00Z",
      progress: { current: 1, desired: 10 },
    });
    const fresh = job("a", {
      last_modified: "2026-10-30T00:00:00Z",
      progress: { current: 9, desired: 10 },
    });

    for (const order of [
      [stale, fresh],
      [fresh, stale],
    ]) {
      const [row] = mergeFreelanceJobs(
        order.map((copy, index) => ({
          source: character(index + 1),
          jobs: [copy],
        })),
      );
      expect(row?.progress.current).toBe(9);
      expect(row?.sources).toHaveLength(2);
    }
  });

  it("does not repeat a source that lists a job twice", () => {
    const [row] = mergeFreelanceJobs([
      { source: character(1), jobs: [job("a"), job("a")] },
    ]);
    expect(row?.sources).toEqual([character(1)]);
  });
});

describe("source selection", () => {
  const sources = [character(1), character(2), corporation(500)];

  it("stores no selection when everything is selected", () => {
    expect(
      nextFreelanceSourceSelection(
        ["character:1", "character:2", "corporation:500"],
        sources,
      ),
    ).toBeNull();
    expect(nextFreelanceSourceSelection(["character:2"], sources)).toEqual([
      "character:2",
    ]);
    expect(
      nextFreelanceSourceSelection(["character:2", "character:99"], sources),
    ).toEqual(["character:2"]);
  });

  it("reads no selection as every source", () => {
    expect([...activeFreelanceSourceKeys(null, sources)]).toEqual([
      "character:1",
      "character:2",
      "corporation:500",
    ]);
  });

  it("keeps an explicit empty selection empty", () => {
    expect(activeFreelanceSourceKeys([], sources).size).toBe(0);
  });

  it("falls back to every source when the selection names none of them", () => {
    expect(activeFreelanceSourceKeys(["character:99"], sources).size).toBe(3);
    expect([
      ...activeFreelanceSourceKeys(["corporation:500", "x"], sources),
    ]).toEqual(["corporation:500"]);
  });
});

describe("parseFreelanceJobId", () => {
  it("accepts the lower-case UUID ESI hands out and nothing else", () => {
    const id = "3868eaed-8278-4cb7-9709-7d7de9c20dc7";
    expect(parseFreelanceJobId(id)).toBe(id);
    expect(parseFreelanceJobId(id.toUpperCase())).toBeNull();
    expect(parseFreelanceJobId(`${id} `)).toBeNull();
    expect(parseFreelanceJobId("0")).toBeNull();
    expect(parseFreelanceJobId(undefined)).toBeNull();
  });
});
