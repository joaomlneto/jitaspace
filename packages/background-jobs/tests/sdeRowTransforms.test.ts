import { describe, expect, it } from "@jest/globals";

// All five modules are runtime-dependency-free (type-only Prisma imports, plus
// sdeFields, which imports nothing), so unlike the other job tests these need
// no p-limit / env mocks.
import {
  rgba,
  toGraphicMaterialSetRow,
} from "../jobs/scrape/sde/graphicMaterialSetTransforms";
import { toMercenaryTacticalOperationRow } from "../jobs/scrape/sde/mercenaryTacticalOperationTransforms";
import {
  annotationValue,
  toCampaignRow,
  toObjectiveRow,
} from "../jobs/scrape/sde/militaryCampaignTransforms";
import {
  toMissionExtraStandingRows,
  toMissionMessageRows,
  toMissionRow,
} from "../jobs/scrape/sde/missionTransforms";
import {
  elementEntries,
  preReqSkillEntries,
} from "../jobs/scrape/sde/shipTreeTransforms";

const en = (text: string) => ({ en: text, de: "ignored" });

describe("toMissionRow", () => {
  it("keeps killMission.dropItemInMissionContainer as a type id", () => {
    // Regression: the field is named like a boolean but is always a types.yaml
    // id. Coercing with Boolean() turned 30762 into `true` and lost the item.
    const row = toMissionRow(875, {
      name: en("The Guristas Spies"),
      killMission: {
        dungeonID: 213,
        objectiveQuantity: 0,
        dropItemInMissionContainer: 30762,
      },
    });
    expect(row.killDropItemInMissionContainerTypeId).toBe(30762);
    expect(row.killDungeonId).toBe(213);
  });

  it("leaves the drop item null when the mission has no killMission", () => {
    const row = toMissionRow(1, { name: en("Courier") });
    expect(row.killDropItemInMissionContainerTypeId).toBeNull();
  });

  it("flattens the reward and bonus-reward sub-objects", () => {
    const row = toMissionRow(2, {
      name: en("Reward"),
      missionRewards: {
        reward: { rewardTypeID: 29, rewardQuantity: 500 },
        bonusReward: { rewardTypeID: 30, rewardQuantity: 1000000 },
        bonusTimeInterval: 3600,
      },
    });
    expect(row).toMatchObject({
      rewardTypeId: 29,
      rewardQuantity: 500,
      bonusRewardTypeId: 30,
      bonusRewardQuantity: 1000000,
      bonusTimeInterval: 3600,
    });
  });

  it("takes English for the name and keeps real booleans boolean", () => {
    const row = toMissionRow(3, {
      name: en("Kill"),
      hasStandingRewards: true,
      courierMission: { objectiveSingleton: false, objectiveTypeID: 1 },
    });
    expect(row.name).toBe("Kill");
    expect(row.hasStandingRewards).toBe(true);
    expect(row.courierObjectiveSingleton).toBe(false);
  });
});

describe("toMissionMessageRows", () => {
  it("keeps English text and drops slots without it", () => {
    const rows = toMissionMessageRows(875, {
      "messages.mission.briefing": en("Briefing"),
      "messages.mission.acceptance": { de: "Nur Deutsch" },
    });
    expect(rows).toEqual([
      {
        missionId: 875,
        key: "messages.mission.briefing",
        text: "Briefing",
        isDeleted: false,
      },
    ]);
  });

  it("returns nothing when there are no messages", () => {
    expect(toMissionMessageRows(1, undefined)).toEqual([]);
  });
});

describe("toMissionExtraStandingRows", () => {
  it("keys standings by faction", () => {
    expect(toMissionExtraStandingRows(875, { "500002": 1.5 })).toEqual([
      { missionId: 875, factionId: 500002, value: 1.5, isDeleted: false },
    ]);
  });
});

describe("toObjectiveRow", () => {
  const record = {
    title: en("Complete Basic Courier Missions"),
    rewards: {
      isk: {
        amountPerInterval: 150000,
        progressInterval: 1,
        issuer: { corporationID: 1000035 },
      },
      lp: {
        amountPerInterval: 300,
        progressInterval: 1,
        issuer: { corporationID: 1000035 },
      },
      standing: {
        gainPercentPerInterval: 5,
        progressInterval: 1,
        issuer: { factionID: 500002 },
      },
    },
  };

  it("reads the standing issuer as a FACTION, not a corporation", () => {
    // Regression: isk/lp carry issuer.corporationID but standing carries
    // issuer.factionID. Reading corporationID for all three left the standing
    // issuer null in every one of the 94 objectives.
    const row = toObjectiveRow("obj-1", "camp-1", record);
    expect(row.standingIssuerFactionId).toBe(500002);
    expect(row.iskIssuerCorporationId).toBe(1000035);
    expect(row.lpIssuerCorporationId).toBe(1000035);
  });

  it("does not confuse the two issuer shapes", () => {
    // A standing block carrying corporationID (which CCP never ships) must not
    // silently populate the faction column.
    const row = toObjectiveRow("obj-2", "camp-1", {
      title: en("x"),
      rewards: { standing: { issuer: { corporationID: 1000035 } } },
    });
    expect(row.standingIssuerFactionId).toBeNull();
  });

  it("flattens the annotations block", () => {
    const row = toObjectiveRow("obj-3", "camp-1", {
      title: en("x"),
      annotations: {
        requiredEnlistmentWithFactionID: 500002,
        restrictionTooltip: en("You need to be enlisted"),
        warning1: en("Careful"),
      },
    });
    expect(row).toMatchObject({
      requiredEnlistmentWithFactionId: 500002,
      restrictionTooltip: "You need to be enlisted",
      warning1: "Careful",
      warning2: null,
    });
  });

  it("carries progress figures as BigInt, past the int4 ceiling", () => {
    // Regression: progress is counted in the unit the contribution method
    // reports, and the ISK-denominated objectives ship targets far beyond
    // 2^31-1 — as `Int` columns those killed the ingest with "integer out of
    // range for type int4". They must be `bigint` and not `number`, too:
    // `recordsAreEqual` compares typeof before value, so a number diffed
    // against the bigint Prisma reads back would re-update every row forever.
    const row = toObjectiveRow("obj-5", "camp-1", {
      title: en("Destroy enemy ships"),
      targetProgress: 500_000_000_000,
      maxProgressPerParticipant: 10_000_000_000,
      rewards: {
        isk: { progressInterval: 5_000_000_000 },
        lp: { progressInterval: 2_500_000_000 },
        standing: { progressInterval: 100_000_000_000 },
      },
    });
    expect(row).toMatchObject({
      targetProgress: 500_000_000_000n,
      maxProgressPerParticipant: 10_000_000_000n,
      iskProgressInterval: 5_000_000_000n,
      lpProgressInterval: 2_500_000_000n,
      standingProgressInterval: 100_000_000_000n,
    });
  });

  it("leaves an absent progress figure null rather than 0n", () => {
    // 0n and null mean different things — "no cap" is not "a cap of zero".
    const row = toObjectiveRow("obj-6", "camp-1", { title: en("x") });
    expect(row).toMatchObject({
      targetProgress: null,
      maxProgressPerParticipant: null,
      iskProgressInterval: null,
      lpProgressInterval: null,
      standingProgressInterval: null,
    });
  });

  it("carries the contribution method name and the campaign link", () => {
    const row = toObjectiveRow("obj-4", "camp-9", {
      title: en("x"),
      contributionMethodConfiguration: { name: "CompleteAgentMission" },
    });
    expect(row.militaryCampaignId).toBe("camp-9");
    expect(row.contributionMethodName).toBe("CompleteAgentMission");
  });
});

describe("toCampaignRow", () => {
  it("reads the campaign issuer as a faction", () => {
    const row = toCampaignRow("camp-1", {
      title: en("The Blessed Exchange"),
      subtitle: en("Bring honour"),
      targetProgress: 30,
      issuer: { factionID: 500003 },
    });
    expect(row).toMatchObject({
      militaryCampaignId: "camp-1",
      title: "The Blessed Exchange",
      subtitle: "Bring honour",
      targetProgress: 30n,
      issuerFactionId: 500003,
    });
  });

  it("carries a campaign target past the int4 ceiling", () => {
    const row = toCampaignRow("camp-2", {
      title: en("Break the Blockade"),
      targetProgress: 4_000_000_000,
    });
    expect(row.targetProgress).toBe(4_000_000_000n);
  });

  it("leaves an absent campaign target null", () => {
    expect(
      toCampaignRow("camp-3", { title: en("x") }).targetProgress,
    ).toBeNull();
  });
});

describe("annotationValue", () => {
  it("stringifies numeric annotations instead of dropping them", () => {
    // Regression: mapFocusEntityID is a bare number in all 4 campaigns (a solar
    // system id in three, a region id in the fourth). Returning null lost it.
    expect(annotationValue(30002187)).toBe("30002187");
    expect(annotationValue(10000041)).toBe("10000041");
  });

  it("prefers English for localized annotations", () => {
    expect(annotationValue(en("Briefing text"))).toBe("Briefing text");
  });

  it("passes plain strings through", () => {
    expect(annotationValue("res:/UI/Texture/a.png")).toBe(
      "res:/UI/Texture/a.png",
    );
  });

  it("keeps the four annotations CCP added in build 3682781", () => {
    // 2026-11-11: `achievementUUID` (plain string), `infoLabel` and
    // `infoLabelHint` (localized) and `uiIndex` (bare number). The annotation
    // table is key/value so new keys need no column, but each value shape still
    // has to come back as text for its row to be written.
    const annotations = {
      achievementUUID: "b6bf1e3d-b219-5184-b075-ea22fc1bcef7",
      infoLabel: en("Race against the Caldari State"),
      infoLabelHint: en("Complete all campaign objectives first."),
      uiIndex: 3,
    };
    expect(
      Object.fromEntries(
        Object.entries(annotations).map(([key, value]) => [
          key,
          annotationValue(value),
        ]),
      ),
    ).toEqual({
      achievementUUID: "b6bf1e3d-b219-5184-b075-ea22fc1bcef7",
      infoLabel: "Race against the Caldari State",
      infoLabelHint: "Complete all campaign objectives first.",
      uiIndex: "3",
    });
  });

  it("stringifies booleans and rejects nullish / unmappable objects", () => {
    expect(annotationValue(false)).toBe("false");
    expect(annotationValue(null)).toBeNull();
    expect(annotationValue(undefined)).toBeNull();
    expect(annotationValue({ de: "only German" })).toBeNull();
  });
});

describe("toMercenaryTacticalOperationRow", () => {
  // A record as build 3698585 ships it: no `dungeonID`.
  const record = {
    name: en("Rogue Drone Emergence"),
    description: en("Destroy all Rogue Drones."),
    anarchyImpact: -20,
    developmentImpact: 10,
    infomorphBonus: 350,
  };

  it("takes the dungeon id from the record key", () => {
    // Regression: CCP removed `dungeonID` after build 3693310 as "identical to
    // key". Reading it gave NaN, Prisma rejected the row, and `ingest-sde-all`
    // stopped at this step on every run from 2026-11-13.
    const row = toMercenaryTacticalOperationRow(12367, record);
    expect(row).toEqual({
      mercenaryTacticalOperationId: 12367,
      name: "Rogue Drone Emergence",
      description: "Destroy all Rogue Drones.",
      dungeonId: 12367,
      anarchyImpact: -20,
      developmentImpact: 10,
      infomorphBonus: 350,
      isDeleted: false,
    });
  });

  it("builds the same row from a record that still carries dungeonID", () => {
    // Builds up to 3693310 repeated the key as a field, so an older archive
    // must produce an identical row and not a spurious update.
    expect(
      toMercenaryTacticalOperationRow(12367, { ...record, dungeonID: 12367 }),
    ).toEqual(toMercenaryTacticalOperationRow(12367, record));
  });

  it("never emits a non-finite number for a complete record", () => {
    const row = toMercenaryTacticalOperationRow(12368, record);
    for (const value of Object.values(row)) {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe("rgba", () => {
  it("pulls the four channels out", () => {
    expect(rgba({ r: 0.87, g: 0.84, b: 0.77, a: 1 })).toEqual({
      r: 0.87,
      g: 0.84,
      b: 0.77,
      a: 1,
    });
  });

  it("yields nulls for a missing colour", () => {
    expect(rgba(undefined)).toEqual({ r: null, g: null, b: null, a: null });
  });
});

describe("toGraphicMaterialSetRow", () => {
  it("flattens all four colours and reads CCP's lowercase custommaterialN", () => {
    const row = toGraphicMaterialSetRow(1, {
      description: "Ardishapur (Amarr Hulls)",
      colorHull: { r: 0.09, g: 0.09, b: 0.09, a: 1 },
      colorWindow: { r: 0.89, g: 0.83, b: 0.69, a: 1 },
      custommaterial1: "red_blood_enamel",
      custommaterial2: "gold_true_polished",
    });
    expect(row).toMatchObject({
      materialSetId: 1,
      description: "Ardishapur (Amarr Hulls)",
      colorHullR: 0.09,
      colorHullA: 1,
      colorWindowR: 0.89,
      customMaterial1: "red_blood_enamel",
      customMaterial2: "gold_true_polished",
      colorPrimaryR: null,
      colorSecondaryA: null,
    });
  });
});

describe("elementEntries", () => {
  it("preserves the slot ordering key", () => {
    expect(elementEntries({ 1: 30, 2: 23, 3: 24 })).toEqual([
      { slot: 1, shipTreeElementId: 30 },
      { slot: 2, shipTreeElementId: 23 },
      { slot: 3, shipTreeElementId: 24 },
    ]);
  });

  it("drops element ids absent from the guard set", () => {
    expect(elementEntries({ 1: 30, 2: 999 }, new Set([30]))).toEqual([
      { slot: 1, shipTreeElementId: 30 },
    ]);
  });

  it("returns nothing for an absent elements map", () => {
    expect(elementEntries(undefined)).toEqual([]);
  });
});

describe("preReqSkillEntries", () => {
  it("flattens faction → skills → level/display", () => {
    expect(
      preReqSkillEntries({
        "500001": { skills: { "3327": { display: false, level: 1 } } },
      }),
    ).toEqual([
      { factionId: 500001, skillTypeId: 3327, level: 1, display: false },
    ]);
  });

  it("nulls a missing level or display rather than coercing", () => {
    expect(
      preReqSkillEntries({ "500002": { skills: { "3328": {} } } }),
    ).toEqual([
      { factionId: 500002, skillTypeId: 3328, level: null, display: null },
    ]);
  });

  it("tolerates a faction with no skills block", () => {
    expect(preReqSkillEntries({ "500003": {} })).toEqual([]);
  });
});
