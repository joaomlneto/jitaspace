import { describe, expect, it } from "@jest/globals";

import type { DogmaAttributeInfo, DogmaEffectInfo } from "~/lib/npcStats";
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

// The SDE's description of the effects these NPCs use (2026-10-08): the
// attributes each reads for its range, falloff and duration, and those its
// modifiers apply.
const effect = (
  effectId: number,
  name: string,
  pointers: { range?: number; falloff?: number; duration?: number },
  modifyingAttributeIds: number[] = [],
  flags: Partial<Pick<DogmaEffectInfo, "isOffensive" | "isAssistance">> = {
    isOffensive: true,
  },
): DogmaEffectInfo => ({
  effectId,
  name,
  isOffensive: false,
  isAssistance: false,
  ...flags,
  rangeAttributeId: pointers.range ?? null,
  falloffAttributeId: pointers.falloff ?? null,
  durationAttributeId: pointers.duration ?? null,
  modifyingAttributeIds,
});
const SCRAMBLE = effect(
  563,
  "warpScrambleForEntity",
  { range: 103, duration: 505 },
  [105],
);
const WEB = effect(
  575,
  "modifyTargetSpeed2",
  { range: 514, duration: 513 },
  [20],
);
const PAINT = effect(
  1879,
  "entityTargetPaint",
  { range: 941, falloff: 954, duration: 945 },
  [554],
);
const NEUT = effect(6691, "entityEnergyNeutralizerFalloff", {
  range: 98,
  duration: 942,
});
const ECM = effect(6695, "entityECMFalloff", { range: 936, duration: 929 });
const DRONE_WEB = effect(6690, "remoteWebifierEntity", {
  range: 54,
  duration: 73,
});
const MINING = effect(17, "mining", { range: 54, duration: 73 }, [], {});
const TARGET_ATTACK = effect(10, "targetAttack", {
  range: 54,
  falloff: 158,
  duration: 51,
});
/** The old-style effects the game drives from attributes alone. */
const INFERABLE = [SCRAMBLE, WEB, PAINT, NEUT, ECM];

const info = (
  name: string,
  displayName: string | null,
  unitId: number | null = null,
  unitSymbol: string | null = null,
): DogmaAttributeInfo => ({ name, displayName, unitId, unitSymbol });
const ATTRIBUTE_INFO = new Map<number, DogmaAttributeInfo>([
  [20, info("speedFactor", "Maximum Velocity Bonus", 124, "%")],
  [77, info("miningAmount", "Mining amount", 9, "m3")],
  [97, info("energyNeutralizerAmount", "Neutralization Amount", 114, "GJ")],
  [105, info("warpScrambleStrength", "Warp Scramble Strength")],
  [
    238,
    info("scanGravimetricStrengthBonus", "Gravimetric ECM Jammer Strength"),
  ],
  [239, info("scanLadarStrengthBonus", "Ladar ECM Jammer Strength")],
  [
    240,
    info("scanMagnetometricStrengthBonus", "Magnetometric ECM Jammer Strength"),
  ],
  [241, info("scanRadarStrengthBonus", "RADAR ECM Jammer Strength")],
  [554, info("signatureRadiusBonus", "Signature Radius Modifier", 124, "%")],
  [2509, info("behaviorWarpScrambleStrength", "")],
  [2822, info("ecmJamDuration", "Jam Duration", 101, "s")],
]);
const dogma = (
  effects: DogmaEffectInfo[],
  inferableEffects: DogmaEffectInfo[] = [],
) => ({ effects, inferableEffects, attributeInfo: ATTRIBUTE_INFO });

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

  it("lists each effect's range, falloff and duration, then its strength", () => {
    const stats = computeNpcStats(
      CITIZEN_ASTUR,
      BANSHEE_TORPEDO,
      dogma([SCRAMBLE, PAINT, NEUT]),
    );
    expect(stats.ewar.map((e) => e.label)).toEqual([
      "Warp Scrambler",
      "Target Painter",
      "Energy Neutralizer",
    ]);
    expect(stats.ewar[0]).toEqual({
      effectId: 563,
      label: "Warp Scrambler",
      iconTypeId: 447,
      values: [
        { label: "Range", value: 20000, unitId: 1, unitSymbol: "m" },
        { label: "Duration", value: 5000, unitId: 101 },
        { label: "Warp Scramble Strength", value: 1 },
      ],
    });
    // The neutralizer's amount is not a modifier: it comes from the list.
    expect(stats.ewar[2]?.values.at(-1)).toEqual({
      label: "Neutralization Amount",
      value: 360,
      unitId: 114,
      unitSymbol: "GJ",
    });
  });

  it("infers an old-style web from its range and duration, not a stray speed factor", () => {
    const inferred = computeNpcStats(
      RENYN_METEN,
      undefined,
      dogma([], INFERABLE),
    );
    expect(inferred.ewar.map((e) => e.label)).toEqual(["Stasis Webifier"]);
    expect(
      computeNpcStats(attrs({ 20: -60 }), undefined, dogma([], INFERABLE)).ewar,
    ).toEqual([]);
  });

  it("infers old-style e-war only from every attribute its effect reads, none 0", () => {
    // Lirsautton Parichaya jams in space, but carries no ECM effect.
    const [jammer] = computeNpcStats(
      attrs({ 929: 20000, 936: 72000, 239: 12 }),
      undefined,
      dogma([], INFERABLE),
    ).ewar;
    expect(jammer?.label).toBe("ECM Jammer");
    expect(jammer?.values.map((v) => [v.label, v.value])).toEqual([
      ["Range", 72000],
      ["Duration", 20000],
      ["Ladar ECM Jammer Strength", 12],
    ]);
    // A web left at 0, and a scram with no duration, are not abilities.
    const notAbilities: Record<number, number>[] = [
      { 513: 0, 514: 0, 20: 0 },
      { 103: 20000, 105: 1 },
    ];
    for (const record of notAbilities) {
      expect(
        computeNpcStats(attrs(record), undefined, dogma([], INFERABLE)).ewar,
      ).toEqual([]);
    }
  });

  it("prefers an effect the type carries over an inferred old-style one", () => {
    // A behavior web the NPC carries, beside non-zero old-style web attributes.
    const behaviorWeb = effect(6743, "npcBehaviorWebifier", {
      range: 2500,
      duration: 2499,
    });
    const [web] = computeNpcStats(
      attrs({ 513: 5000, 514: 15000, 2499: 6000, 2500: 30000 }),
      undefined,
      dogma([behaviorWeb], INFERABLE),
    ).ewar;
    expect(web?.effectId).toBe(6743);
    expect(web?.values[0]).toMatchObject({ label: "Range", value: 30000 });
  });

  it("names an unknown offensive effect by its own name, with no icon", () => {
    const [ability] = computeNpcStats(
      attrs({ 73: 5000 }),
      undefined,
      dogma([effect(1752, "entityEwTestEffectJam", { duration: 73 })]),
    ).ewar;
    expect(ability).toEqual({
      effectId: 1752,
      label: "Ew test effect jam",
      iconTypeId: undefined,
      values: [{ label: "Duration", value: 5000, unitId: 101 }],
    });
  });

  it("labels a strength with no display name from its attribute name", () => {
    const [scrambler] = computeNpcStats(
      attrs({ 2506: 5000, 2507: 10000, 2509: 2 }),
      undefined,
      dogma([
        effect(
          6745,
          "behaviorWarpScramble",
          { range: 2507, duration: 2506 },
          [2509],
        ),
      ]),
    ).ewar;
    expect(scrambler?.label).toBe("Warp Scrambler");
    expect(scrambler?.values.at(-1)).toEqual({
      label: "Warp scramble strength",
      value: 2,
    });
  });

  it("leaves weapons to the damage model", () => {
    expect(
      computeNpcStats(RENYN_METEN, undefined, dogma([TARGET_ATTACK])).ewar,
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

  it("queries every attribute the damage, tank and navigation read", () => {
    for (const id of [507, 212, 506, 51, 64, 263, 113, 552]) {
      expect(NPC_STAT_ATTRIBUTE_IDS).toContain(id);
    }
  });
});

describe("hasCombatStats", () => {
  it("is true for anything that fights, jams or can be shot", () => {
    expect(hasCombatStats(computeNpcStats(RENYN_METEN))).toBe(true);
    expect(hasCombatStats(computeNpcStats(attrs({ 9: 100 })))).toBe(true);
    expect(
      hasCombatStats(
        computeNpcStats(
          attrs({ 103: 20000, 505: 5000 }),
          undefined,
          dogma([], INFERABLE),
        ),
      ),
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
    const stats = computeNpcStats(
      HAMMERHEAD_II,
      undefined,
      dogma([TARGET_ATTACK]),
    );
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
      computeNpcStats(BERSERKER_SW_900, undefined, dogma([DRONE_WEB])).ewar,
    ).toEqual([
      {
        effectId: 6690,
        iconTypeId: 526,
        label: "Stasis Webifier",
        values: [
          { label: "Range", value: 10000, unitId: 1, unitSymbol: "m" },
          { label: "Duration", value: 5000, unitId: 101 },
          {
            label: "Maximum Velocity Bonus",
            value: -20,
            unitId: 124,
            unitSymbol: "%",
          },
        ],
      },
    ]);
    // The same attributes on a type without the effect are not a web: a
    // drone's generic range and duration are never inferred.
    expect(
      computeNpcStats(BERSERKER_SW_900, undefined, dogma([], INFERABLE)).ewar,
    ).toEqual([]);
  });

  it("gives an ECM drone its jam duration and strengths", () => {
    const [jammer] = computeNpcStats(
      HORNET_EC_300,
      undefined,
      dogma([ECM]),
    ).ewar;
    expect(jammer?.label).toBe("ECM Jammer");
    expect(jammer?.values.map((v) => v.label)).toEqual([
      "Range",
      "Duration",
      "Jam Duration",
      "Gravimetric ECM Jammer Strength",
      "Ladar ECM Jammer Strength",
      "Magnetometric ECM Jammer Strength",
      "RADAR ECM Jammer Strength",
    ]);
  });

  it("describes a mining drone's yield", () => {
    const stats = computeNpcStats(MINING_DRONE_II, undefined, dogma([MINING]));
    expect(stats.weapons).toEqual([]);
    expect(stats.ewar).toEqual([
      {
        effectId: 17,
        iconTypeId: 483,
        label: "Mining",
        values: [
          { label: "Range", value: 5000, unitId: 1, unitSymbol: "m" },
          { label: "Duration", value: 60000, unitId: 101 },
          { label: "Mining amount", value: 33, unitId: 9, unitSymbol: "m3" },
        ],
      },
    ]);
    expect(hasCombatStats(stats)).toBe(true);
  });
});
