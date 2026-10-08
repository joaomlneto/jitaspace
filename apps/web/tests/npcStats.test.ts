import { describe, expect, it } from "@jest/globals";

import {
  computeNpcStats,
  hasCombatStats,
  NPC_STAT_ATTRIBUTE_IDS,
  sumDamage,
} from "~/lib/npcStats";

// Dogma attributes as ESI's GET /universe/types/{id} returns them
// (2026-10-06). The expected figures are the ones eve-incursions.de showed.
const attrs = (record: Record<number, number>) =>
  new Map(Object.entries(record).map(([k, v]) => [Number(k), v]));

const CITIZEN_ASTUR = attrs({
  9: 10450,
  37: 850,
  97: 360,
  98: 12000,
  103: 20000,
  105: 1,
  212: 10,
  247: 35000,
  263: 41800,
  265: 20900,
  267: 0.55,
  268: 0.55,
  269: 0.55,
  270: 0.55,
  271: 0.32,
  272: 0.32,
  273: 0.32,
  274: 0.32,
  416: 12000,
  505: 5000,
  506: 5500,
  507: 2210,
  508: 118,
  552: 540,
  564: 105,
  941: 45000,
  942: 12000,
  945: 10000,
  954: 90000,
});
const BANSHEE_TORPEDO = attrs({ 114: 0, 116: 225, 117: 225, 118: 0 });

const LIRSAUTTON_PARICHAYA = attrs({
  9: 8000,
  37: 1400,
  212: 2,
  247: 10000,
  263: 6000,
  265: 5500,
  267: 0.4,
  268: 0.8,
  269: 0.75,
  270: 0.65,
  271: 1,
  272: 0.4,
  273: 0.6,
  274: 0.8,
  416: 7500,
  506: 15000,
  507: 2947,
  508: 158,
  552: 125,
  564: 200,
});
const COMPACT_SHADE_TORPEDO = attrs({ 114: 0, 116: 1650, 117: 1650, 118: 0 });

const RENYN_METEN = attrs({
  9: 484,
  20: -60,
  37: 2550,
  51: 5000,
  64: 80,
  114: 6,
  118: 6,
  247: 12000,
  263: 1936,
  265: 968,
  267: 0.38,
  268: 0.38,
  269: 0.38,
  270: 0.38,
  271: 0.33,
  272: 0.33,
  273: 0.33,
  274: 0.33,
  416: 9000,
  508: 410,
  513: 5000,
  514: 15000,
  552: 33,
  564: 875,
});

describe("computeNpcStats", () => {
  it("takes missile damage from the missile, scaled by the launcher", () => {
    const stats = computeNpcStats(CITIZEN_ASTUR, BANSHEE_TORPEDO);
    expect(stats.alpha).toEqual({
      em: 0,
      thermal: 0,
      kinetic: 2250,
      explosive: 2250,
    });
    expect(sumDamage(stats.alpha!)).toBe(4500);
    expect(sumDamage(stats.dps!)).toBeCloseTo(818.18, 2);
    expect(stats.weapons).toEqual([
      expect.objectContaining({ kind: "missile", missileTypeId: 2210 }),
    ]);
  });

  it("computes hit points and an even-spread EHP per layer", () => {
    const stats = computeNpcStats(CITIZEN_ASTUR, BANSHEE_TORPEDO);
    expect(stats.shield.hp).toBe(41800);
    expect(stats.shield.ehp).toBeCloseTo(130625, 3);
    expect(stats.shield.resists.em).toBeCloseTo(0.68);
    expect(stats.armor.ehp).toBeCloseTo(38000, 3);
    // No structure resonance attributes: no resistance.
    expect(stats.structure).toEqual({
      hp: 10450,
      resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
      ehp: 10450,
    });
  });

  it("averages uneven resistances", () => {
    const stats = computeNpcStats(LIRSAUTTON_PARICHAYA, COMPACT_SHADE_TORPEDO);
    expect(stats.shield.resists.em).toBeCloseTo(0);
    expect(stats.shield.resists.thermal).toBeCloseTo(0.2);
    expect(stats.shield.resists.kinetic).toBeCloseTo(0.4);
    expect(stats.shield.resists.explosive).toBeCloseTo(0.6);
    expect(stats.shield.ehp).toBeCloseTo(8571.43, 2);
    expect(stats.armor.ehp).toBeCloseTo(8461.54, 2);
    expect(sumDamage(stats.alpha!)).toBe(6600);
    expect(sumDamage(stats.dps!)).toBeCloseTo(440);
  });

  it("fires turrets from the NPC's own damage attributes", () => {
    const stats = computeNpcStats(RENYN_METEN);
    expect(stats.alpha).toEqual({
      em: 480,
      thermal: 480,
      kinetic: 0,
      explosive: 0,
    });
    expect(sumDamage(stats.dps!)).toBe(192);
  });

  it("leaves alpha and DPS out when the missile is unknown", () => {
    const stats = computeNpcStats(CITIZEN_ASTUR);
    expect(stats.weapons).toEqual([]);
    expect(stats.alpha).toBeUndefined();
    expect(stats.dps).toBeUndefined();
  });

  it("lists electronic warfare with its values in display units", () => {
    const stats = computeNpcStats(CITIZEN_ASTUR, BANSHEE_TORPEDO);
    expect(stats.ewar.map((e) => e.label)).toEqual([
      "Warp Scrambler",
      "Energy Neutralizer",
      "Target Painter",
    ]);
    expect(stats.ewar[0]?.values).toEqual([
      { label: "Range", value: 20000, unit: "m" },
      { label: "Duration", value: 5, unit: "s" },
      { label: "Strength", value: 1, unit: "" },
    ]);
  });

  it("counts a web only with its range and duration, not a stray speed factor", () => {
    expect(computeNpcStats(RENYN_METEN).ewar.map((e) => e.label)).toEqual([
      "Stasis Webifier",
    ]);
    expect(
      computeNpcStats(attrs({ 20: -60 })).ewar.map((e) => e.label),
    ).toEqual([]);
  });

  it("exposes navigation and targeting", () => {
    const stats = computeNpcStats(CITIZEN_ASTUR, BANSHEE_TORPEDO);
    expect(stats).toMatchObject({
      attackRange: 35000,
      orbitRange: 12000,
      orbitSpeed: 118,
      chaseSpeed: 850,
      signatureRadius: 540,
      scanResolution: 105,
    });
  });

  it("queries every attribute it reads", () => {
    for (const id of [507, 212, 506, 51, 64, 263, 113, 1671, 20]) {
      expect(NPC_STAT_ATTRIBUTE_IDS).toContain(id);
    }
  });
});

describe("hasCombatStats", () => {
  it("is true for anything that fights, jams or can be shot", () => {
    expect(hasCombatStats(computeNpcStats(RENYN_METEN))).toBe(true);
    expect(hasCombatStats(computeNpcStats(attrs({ 9: 100 })))).toBe(true);
    expect(
      hasCombatStats(computeNpcStats(attrs({ 103: 20000, 505: 5000 }))),
    ).toBe(true);
  });

  it("is false for a type with no combat attributes", () => {
    expect(hasCombatStats(computeNpcStats(attrs({})))).toBe(false);
  });
});

describe("computeNpcStats edge cases", () => {
  it("cycles a turret on its own rate of fire, not a stray missile launch time", () => {
    // Auga Hypophysis: lasers at 5,000 ms, plus a missileLaunchDuration of
    // 5,500 ms with no missile to launch. eve-incursions.de let the stray
    // value win and showed 436.4 DPS.
    const stats = computeNpcStats(
      attrs({ 51: 5000, 64: 60, 114: 20, 118: 20, 506: 5500 }),
    );
    expect(stats.weapons).toHaveLength(1);
    expect(stats.weapons[0]?.cycleSeconds).toBe(5);
    expect(sumDamage(stats.dps!)).toBe(480);
  });
});

// ESI's GET /universe/types/{id}, 2026-10-06.
const HAMMERHEAD_II = attrs({
  9: 480,
  37: 2016,
  51: 4000,
  54: 4200,
  64: 1.92,
  114: 0,
  116: 0,
  117: 0,
  118: 32,
  158: 3000,
  160: 0.696,
  247: 5600,
  263: 120,
  265: 216,
  267: 0.5,
  268: 0.9,
  269: 0.65,
  270: 0.65,
  271: 1,
  272: 0.5,
  273: 0.6,
  274: 0.8,
  416: 1400,
  508: 528,
  552: 50,
});
const BERSERKER_SW_900 = attrs({
  9: 235,
  20: -20,
  37: 2000,
  54: 10000,
  73: 5000,
  263: 225,
  265: 150,
});
const HORNET_EC_300 = attrs({
  9: 50,
  238: 1,
  239: 1,
  240: 1,
  241: 1,
  263: 100,
  265: 50,
  929: 20000,
  936: 7500,
  2822: 5000,
});
const MINING_DRONE_II = attrs({ 9: 60, 54: 5000, 73: 60000, 77: 33 });

describe("computeNpcStats for drones", () => {
  it("fires a combat drone's turret, with its optimal, falloff and tracking", () => {
    const stats = computeNpcStats(HAMMERHEAD_II, undefined, new Set([10]));
    expect(stats.alpha?.thermal).toBeCloseTo(61.44);
    expect(sumDamage(stats.dps!)).toBeCloseTo(15.36);
    expect(stats.weapons[0]).toMatchObject({
      kind: "turret",
      optimalRange: 4200,
      falloff: 3000,
      trackingSpeed: 0.696,
    });
    expect(stats.ewar).toEqual([]);
  });

  it("webs only with the web effect, from the generic range and duration", () => {
    expect(
      computeNpcStats(BERSERKER_SW_900, undefined, new Set([6690])).ewar,
    ).toEqual([
      {
        iconTypeId: 526,
        label: "Stasis Webifier",
        values: [
          { label: "Range", value: 10000, unit: "m" },
          { label: "Duration", value: 5, unit: "s" },
          { label: "Velocity", value: -20, unit: "%" },
        ],
      },
    ]);
    // The same attributes on a type without the effect are not a web.
    expect(computeNpcStats(BERSERKER_SW_900).ewar).toEqual([]);
  });

  it("gives an ECM drone its jam duration and strengths", () => {
    const [jammer] = computeNpcStats(
      HORNET_EC_300,
      undefined,
      new Set([6695]),
    ).ewar;
    expect(jammer?.label).toBe("ECM Jammer");
    expect(jammer?.values.map((v) => v.label)).toEqual([
      "Range",
      "Duration",
      "Jam duration",
      "Gravimetric strength",
      "Ladar strength",
      "Magnetometric strength",
      "Radar strength",
    ]);
  });

  it("describes a mining drone's yield", () => {
    const stats = computeNpcStats(MINING_DRONE_II, undefined, new Set([17]));
    expect(stats.weapons).toEqual([]);
    expect(stats.ewar).toEqual([
      {
        iconTypeId: 483,
        label: "Mining",
        values: [
          { label: "Range", value: 5000, unit: "m" },
          { label: "Duration", value: 60, unit: "s" },
          { label: "Amount", value: 33, unit: "m³" },
        ],
      },
    ]);
    expect(hasCombatStats(stats)).toBe(true);
  });
});
