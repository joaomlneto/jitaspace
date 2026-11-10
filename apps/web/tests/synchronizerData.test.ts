/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DataModule from "~/lib/synchronizerData";
import type {
  FeederModifier,
  ModuleRow,
  RigAttributeRow,
  TypeModifier,
} from "~/lib/synchronizerData";

type Fn = ReturnType<typeof jest.fn<(...args: unknown[]) => Promise<unknown>>>;
const fn = (): Fn => jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPrisma = {
  dogmaEffectModifier: { findMany: fn() },
  typeAttribute: { findMany: fn() },
  typeEffect: { findMany: fn() },
  type: { findMany: fn() },
  dogmaAttribute: { findMany: fn() },
};
jest.mock("~/lib/db", () => ({ prisma: mockPrisma }));

const load = () => require("~/lib/synchronizerData") as typeof DataModule;

beforeEach(() => {
  jest.clearAllMocks();
});

// Fixtures: the SDE's own rows (Fractured Skies, build 3682781), as the
// production database holds them.

const SYNCHRONIZER_GROUP = 5140;
const SYNCHRONIZATION_RIGGING = 96100;

const mod = (
  effectId: number,
  func: string,
  domain: string,
  operator: number,
  groupId: number | null,
  modifiedAttributeId: number,
  modifyingAttributeId: number,
  description: string | null = null,
): TypeModifier => ({
  effectId,
  func,
  domain,
  operator,
  groupId,
  modifiedAttributeId,
  modifyingAttributeId,
  effect: { description: null, customDescription: description },
});

/** Large Dread Guristas Synchronizer (96720), by effect then index. */
const dreadGuristasModifiers: TypeModifier[] = [
  ...[238, 239, 240, 241].map((attr) =>
    mod(1318, "LocationRequiredSkillModifier", "shipID", 6, null, attr, 828),
  ),
  mod(1452, "LocationGroupModifier", "shipID", 6, 201, 54, 294, "ECM range."),
  mod(2015, "OwnerRequiredSkillModifier", "charID", 6, null, 263, 327),
  mod(2016, "OwnerRequiredSkillModifier", "charID", 6, null, 265, 327),
  mod(2017, "OwnerRequiredSkillModifier", "charID", 6, null, 9, 327),
  mod(2713, "ItemModifier", "shipID", 6, null, 48, 1138, "Reduces CPU."),
  ...[271, 272, 273, 274].map((attr, i) =>
    mod(2795, "ItemModifier", "shipID", 6, null, attr, 984 + i),
  ),
  mod(13010, "OwnerRequiredSkillModifier", "charID", 6, null, 64, 1255),
  mod(13011, "ItemModifier", "charID", 6, null, 458, 6397),
  // guristasRigSetBonusEffectmodAdd: add to the bonuses, subtract from the
  // resistance bonuses stored as negative percentages.
  ...[1255, 294, 828, 327].map((attr) =>
    mod(13012, "ItemModifier", "itemID", 2, null, attr, 6379),
  ),
  ...[984, 985, 986, 987].map((attr) =>
    mod(13012, "ItemModifier", "itemID", 3, null, attr, 6379),
  ),
];

/** Large Caldari Navy Synchronizer (96145). */
const caldariNavyModifiers: TypeModifier[] = [
  mod(446, "ItemModifier", "shipID", 6, null, 263, 337),
  mod(1764, "OwnerRequiredSkillModifier", "charID", 6, null, 37, 20),
  mod(2713, "ItemModifier", "shipID", 6, null, 48, 1138),
  mod(5081, "ItemModifier", "shipID", 6, null, 76, 309),
  ...[20, 6407, 337, 309].map((attr) =>
    mod(12985, "ItemModifier", "itemID", 2, null, attr, 6317),
  ),
  // The missile damage bonus reaches missiles through a hidden multiplier.
  mod(13020, "LocationGroupModifier", "shipID", 6, 5140, 6530, 6407),
  mod(13073, "ItemModifier", "charID", 0, null, 212, 6530),
];

/** Every feeder in the SDE for these two counters, plus one for another. */
const feeders: FeederModifier[] = [
  { effectId: 12964, modifiedAttributeId: 6317, modifyingAttributeId: 6313 },
  { effectId: 12991, modifiedAttributeId: 6379, modifyingAttributeId: 6374 },
];

const attr = (
  attributeId: number,
  value: number,
  displayName: string | null,
  unitId: number | null = 105,
  name = `attr${attributeId}`,
): RigAttributeRow => ({
  attributeId,
  value,
  attribute: {
    name,
    displayName,
    unitId,
    DogmaUnit: unitId === null ? null : { displayName: "%", name: "Percent" },
  },
});

/** The Large Dread Guristas Synchronizer's attribute rows. */
const dreadGuristasAttributes: RigAttributeRow[] = [
  attr(294, 5, "Optimal Range Modifier", 121),
  attr(327, 10, "Hitpoint Bonus"),
  attr(828, 5, "EW Strength Modifier"),
  attr(984, -5, "EM Damage Resistance Bonus", 124),
  attr(985, -5, "Explosive Damage Resistance Bonus", 124),
  attr(986, -5, "Kinetic Damage Resistance Bonus"),
  attr(987, -5, "Thermal Damage Resistance Bonus", 124),
  attr(1138, -10, "Drawback"),
  attr(1255, 10, "Drone Damage Bonus"),
  attr(1544, 1, "Max Modules Of This Group Allowed", null),
  attr(6379, 0, "Dread Guristas Modules Fitted", null),
  attr(6397, -60, "Drone Maximum Control Range Penalty"),
];

const moduleRow = (
  typeId: number,
  name: string,
  groupName: string,
  amount?: number,
): ModuleRow => ({
  typeId,
  name,
  groupId: typeId,
  group: { name: groupName },
  attributes: amount === undefined ? [] : [{ value: amount }],
});

const skillRow = {
  attributeId: 1138,
  skill: {
    typeId: SYNCHRONIZATION_RIGGING,
    name: "Synchronization Rigging",
    percentPerLevel: -10,
  },
};

describe("classifyRig", () => {
  it("finds the Dread Guristas counter, what it scales and how", () => {
    const rig = load().classifyRig(dreadGuristasModifiers, feeders);
    expect(rig?.counterAttributeId).toBe(6379);
    expect(Object.fromEntries(rig?.scaling ?? [])).toEqual({
      1255: 1, // drone damage
      294: 1, // ECM optimal range
      828: 1, // ECM strength
      327: 1, // drone hitpoints
      984: -1, // shield resistances, stored negative and subtracted from
      985: -1,
      986: -1,
      987: -1,
    });
    expect(rig?.feederEffectIds).toEqual([12991]);
    expect(rig?.amountAttributeIds).toEqual([6374]);
  });

  it("leaves the CPU drawback and the drone range penalty fixed", () => {
    // Expansion notes: a 60% penalty to maximum drone control range, and a
    // drawback that reduces the ship's total CPU; neither is said to scale.
    expect(
      load().classifyRig(dreadGuristasModifiers, feeders)?.fixedIds,
    ).toEqual([1138, 6397]);
  });

  it("adds to every Caldari Navy bonus", () => {
    const rig = load().classifyRig(caldariNavyModifiers, feeders);
    expect(rig?.counterAttributeId).toBe(6317);
    expect([...(rig?.scaling.values() ?? [])]).toEqual([1, 1, 1, 1]);
    expect([...(rig?.scaling.keys() ?? [])]).toEqual([20, 6407, 337, 309]);
    // The hidden multiplier is fixed here; assembleRig drops it for having
    // no display name.
    expect(rig?.fixedIds).toEqual([1138, 6530]);
  });

  it("is null for a rig without a counter", () => {
    // Large Projectile Burst Aerator I: plain postPercent effects only.
    const aerator = [mod(1000, "ItemModifier", "shipID", 6, null, 64, 1255)];
    expect(load().classifyRig(aerator, feeders)).toBeNull();
  });

  it("is null for a counter no module feeds", () => {
    expect(
      load().classifyRig(dreadGuristasModifiers, [feeders[0]!]),
    ).toBeNull();
  });
});

describe("assembleRig", () => {
  const assemble = (
    overrides: Partial<Parameters<typeof DataModule.assembleRig>[0]> = {},
  ) => {
    const data = load();
    const classification = data.classifyRig(dreadGuristasModifiers, feeders);
    if (!classification) throw new Error("not a synchronizer");
    return data.assembleRig({
      classification,
      modifiers: dreadGuristasModifiers,
      rigAttributes: dreadGuristasAttributes,
      modules: [
        moduleRow(14246, "Dread Guristas Warp Disruptor", "Warp Scrambler", 1),
        moduleRow(
          13965,
          "Dread Guristas EM Shield Hardener",
          "Shield Hardener",
          1,
        ),
        moduleRow(
          13937,
          "Dread Guristas Ballistic Control System",
          "Ballistic Control System",
          1,
        ),
      ],
      attributeDefaults: new Map([
        [6374, 0],
        [6379, 0],
      ]),
      skills: [skillRow],
      ...overrides,
    });
  };

  it("lists the bonuses with the expansion notes' numbers", () => {
    // Notes: 10% drone hitpoints and damage, 5% shield resistances, 5% ECM
    // strength and optimal range.
    expect(
      assemble().scaling.map(({ name, base, direction }) => [
        name,
        base,
        direction,
      ]),
    ).toEqual([
      ["Drone Damage Bonus", 10, 1],
      ["Optimal Range Modifier", 5, 1],
      ["EW Strength Modifier", 5, 1],
      ["Hitpoint Bonus", 10, 1],
      ["EM Damage Resistance Bonus", -5, -1],
      ["Explosive Damage Resistance Bonus", -5, -1],
      ["Kinetic Damage Resistance Bonus", -5, -1],
      ["Thermal Damage Resistance Bonus", -5, -1],
    ]);
  });

  it("keeps the penalties fixed, with the skill on the CPU drawback only", () => {
    expect(
      assemble().fixed.map(({ name, base, skills }) => [name, base, skills]),
    ).toEqual([
      ["Drawback", -10, [skillRow.skill]],
      ["Drone Maximum Control Range Penalty", -60, undefined],
    ]);
  });

  it("describes each attribute from the effect that applies it", () => {
    const rig = assemble();
    expect(rig.scaling[1]?.appliesTo).toEqual({
      text: "ECM range.",
      source: "ai",
    });
    expect(rig.fixed[0]?.appliesTo?.text).toBe("Reduces CPU.");
  });

  it("names the counter and reads its starting value off the rig", () => {
    const rig = assemble();
    expect(rig.counterName).toBe("Dread Guristas Modules Fitted");
    expect(rig.counterBase).toBe(0);
    expect(
      assemble({
        rigAttributes: dreadGuristasAttributes.filter(
          (row) => row.attributeId !== 6379,
        ),
        attributeDefaults: new Map([[6379, 2]]),
      }).counterBase,
    ).toBe(2);
  });

  it("sorts the modules by group, then name", () => {
    expect(assemble().modules.map((module) => module.groupName)).toEqual([
      "Ballistic Control System",
      "Shield Hardener",
      "Warp Scrambler",
    ]);
  });

  it("gives a module without the amount the attribute's default, as dogma does", () => {
    const rig = assemble({
      modules: [moduleRow(1, "Dread Guristas Thing", "Thing")],
    });
    expect(rig.modules[0]?.amount).toBe(0);
  });

  it("drops the hidden damage multiplier from the Caldari Navy rig", () => {
    const data = load();
    const classification = data.classifyRig(caldariNavyModifiers, feeders);
    if (!classification) throw new Error("not a synchronizer");
    const rig = data.assembleRig({
      classification,
      modifiers: caldariNavyModifiers,
      rigAttributes: [
        attr(20, 5, "Maximum Velocity Bonus", 124),
        attr(309, 5, "Maximum Targeting Range Bonus"),
        attr(337, 5, "Shield Capacity Bonus", 121),
        attr(1138, -10, "Drawback"),
        attr(6317, 0, "Caldari Navy Modules Fitted", null),
        attr(6407, 5, "Missile Damage Bonus"),
        attr(6530, 1, null, 104, "rigHiddenMissileDamageMultiplier"),
      ],
      modules: [],
      attributeDefaults: new Map(),
      skills: [],
    });
    expect(rig.scaling.map((attribute) => attribute.name)).toEqual([
      "Maximum Velocity Bonus",
      "Missile Damage Bonus",
      "Shield Capacity Bonus",
      "Maximum Targeting Range Bonus",
    ]);
    expect(rig.fixed.map((attribute) => attribute.name)).toEqual(["Drawback"]);
  });
});

describe("assembleRigSkills", () => {
  // Synchronization Rigging: rigDrawbackReductionModuleSet applies its
  // rigDrawbackBonus (1139, -10) to the group's drawback (1138) as a
  // PostPercent, and rigDrawbackSkillEffect multiplies that by skillLevel.
  const candidate = {
    attributeId: 1138,
    amountAttributeId: 1139,
    typeId: SYNCHRONIZATION_RIGGING,
    name: "Synchronization Rigging",
  };
  const amount = {
    typeId: SYNCHRONIZATION_RIGGING,
    attributeId: 1139,
    value: -10,
  };
  const perLevel = {
    modifiedAttributeId: 1139,
    effect: { TypeEffect: [{ typeId: SYNCHRONIZATION_RIGGING }] },
  };

  it("keeps a skill that scales the drawback per level", () => {
    expect(load().assembleRigSkills([candidate], [amount], [perLevel])).toEqual(
      [skillRow],
    );
  });

  it("drops one whose amount is not multiplied by its level", () => {
    expect(load().assembleRigSkills([candidate], [amount], [])).toEqual([]);
    expect(
      load().assembleRigSkills(
        [candidate],
        [amount],
        [{ ...perLevel, effect: { TypeEffect: [{ typeId: 3300 }] } }],
      ),
    ).toEqual([]);
  });

  it("drops one with no amount", () => {
    expect(load().assembleRigSkills([candidate], [], [perLevel])).toEqual([]);
  });
});

describe("assembleTargets", () => {
  /** Caldari Navy Ballistic Control System (15681)'s set-bonus effect. */
  const moduleModifiers = [
    mod(
      12964,
      "LocationGroupModifier",
      "shipID",
      2,
      SYNCHRONIZER_GROUP,
      6317,
      6313,
    ),
  ];
  const rig = (typeId: number, name: string, groupId = SYNCHRONIZER_GROUP) => ({
    typeId,
    name,
    groupId,
    attributes: [
      {
        attributeId: 6317,
        attribute: { displayName: "Caldari Navy Modules Fitted", name: null },
      },
    ],
  });
  const rigs = [
    rig(96139, "Small Caldari Navy Synchronizer"),
    rig(96144, "Medium Caldari Navy Synchronizer"),
    rig(96145, "Large Caldari Navy Synchronizer"),
  ];

  it("lists the three sizes of the faction's rig, with the module's amount", () => {
    expect(
      load().assembleTargets({
        modifiers: moduleModifiers,
        ownAttributes: [{ attributeId: 6313, value: 1 }],
        rigs,
        spentCounters: new Set([6317]),
        attributeDefaults: new Map([[6313, 0]]),
      }),
    ).toEqual(
      rigs.map(({ typeId, name }) => ({
        typeId,
        name,
        counterName: "Caldari Navy Modules Fitted",
        amount: 1,
      })),
    );
  });

  it("ignores a counter no rig spends, and a rig outside the group", () => {
    const data = load();
    const base = {
      modifiers: moduleModifiers,
      ownAttributes: [{ attributeId: 6313, value: 1 }],
      attributeDefaults: new Map<number, number>(),
    };
    expect(
      data.assembleTargets({ ...base, rigs, spentCounters: new Set() }),
    ).toEqual([]);
    expect(
      data.assembleTargets({
        ...base,
        rigs: [rig(1, "Some Other Rig", 782)],
        spentCounters: new Set([6317]),
      }),
    ).toEqual([]);
  });

  it("falls back to the amount attribute's default", () => {
    expect(
      load().assembleTargets({
        modifiers: moduleModifiers,
        ownAttributes: [],
        rigs: rigs.slice(0, 1),
        spentCounters: new Set([6317]),
        attributeDefaults: new Map([[6313, 0]]),
      })[0]?.amount,
    ).toBe(0);
  });
});

describe("readTypeSynchronizer", () => {
  it("costs one query for a type outside the chain", async () => {
    mockPrisma.dogmaEffectModifier.findMany.mockResolvedValue([
      mod(1000, "ItemModifier", "shipID", 6, null, 64, 1255),
    ]);
    await expect(load().readTypeSynchronizer(26046, 782)).resolves.toEqual({
      rig: null,
      countsTowards: [],
    });
    expect(mockPrisma.dogmaEffectModifier.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.typeAttribute.findMany).not.toHaveBeenCalled();
  });

  it("throws on a database failure, for the caller to degrade", async () => {
    mockPrisma.dogmaEffectModifier.findMany.mockRejectedValue(
      new Error("connection refused"),
    );
    await expect(load().readTypeSynchronizer(96720, 5140)).rejects.toThrow(
      "connection refused",
    );
  });
});

/**
 * A stand-in database holding the SDE rows above, answering each query the
 * data layer makes by the shape of its `where`.
 */
function serveSde() {
  type Where = Record<string, unknown>;
  const whereOf = (args: unknown) => (args as { where: Where }).where;

  mockPrisma.dogmaEffectModifier.findMany.mockImplementation((args) => {
    const where = whereOf(args);
    const typeId = (
      where.effect as
        | { TypeEffect?: { some?: { typeId?: number } } }
        | undefined
    )?.TypeEffect?.some?.typeId;
    if (typeId === 96720) return Promise.resolve(dreadGuristasModifiers);
    if (typeId === 15681) {
      return Promise.resolve([
        mod(12964, "LocationGroupModifier", "shipID", 2, 5140, 6317, 6313),
      ]);
    }
    if (where.func === "LocationGroupModifier" && where.operator === 2) {
      return Promise.resolve(feeders);
    }
    if (where.func === "LocationGroupModifier" && where.operator === 6) {
      return Promise.resolve([
        {
          modifiedAttributeId: 1138,
          modifyingAttributeId: 1139,
          effect: {
            TypeEffect: [
              {
                type: {
                  typeId: SYNCHRONIZATION_RIGGING,
                  name: "Synchronization Rigging",
                },
              },
            ],
          },
        },
      ]);
    }
    if (where.func === "ItemModifier" && where.operator === 0) {
      return Promise.resolve([
        {
          modifiedAttributeId: 1139,
          effect: { TypeEffect: [{ typeId: SYNCHRONIZATION_RIGGING }] },
        },
      ]);
    }
    if (where.func === "ItemModifier") {
      return Promise.resolve([{ modifyingAttributeId: 6317 }]);
    }
    return Promise.resolve([]);
  });

  mockPrisma.typeAttribute.findMany.mockImplementation((args) => {
    const where = whereOf(args);
    if (where.typeId === 96720) return Promise.resolve(dreadGuristasAttributes);
    if (where.typeId === 15681) {
      return Promise.resolve([{ attributeId: 6313, value: 1 }]);
    }
    // Synchronization Rigging's per-level amount.
    return Promise.resolve([
      { typeId: SYNCHRONIZATION_RIGGING, attributeId: 1139, value: -10 },
    ]);
  });

  const hardener = moduleRow(
    13965,
    "Dread Guristas EM Shield Hardener",
    "Shield Hardener",
    1,
  );
  mockPrisma.typeEffect.findMany.mockResolvedValue([
    {
      type: moduleRow(
        14246,
        "Dread Guristas Warp Disruptor",
        "Warp Scrambler",
        1,
      ),
    },
    { type: hardener },
    // A module carrying the feeder effect twice is still one module.
    { type: hardener },
  ]);
  mockPrisma.dogmaAttribute.findMany.mockResolvedValue([
    { attributeId: 6379, defaultValue: 0 },
    { attributeId: 6374, defaultValue: 0 },
    { attributeId: 6313, defaultValue: 0 },
    { attributeId: 9999, defaultValue: null },
  ]);
  mockPrisma.type.findMany.mockResolvedValue(
    [
      [96139, "Small Caldari Navy Synchronizer"],
      [96144, "Medium Caldari Navy Synchronizer"],
      [96145, "Large Caldari Navy Synchronizer"],
    ].map(([typeId, name]) => ({
      typeId,
      name,
      groupId: SYNCHRONIZER_GROUP,
      attributes: [
        {
          attributeId: 6317,
          attribute: { displayName: "Caldari Navy Modules Fitted", name: null },
        },
      ],
    })),
  );
}

describe("readTypeSynchronizer against the SDE's rows", () => {
  it("reads the Large Dread Guristas Synchronizer whole", async () => {
    serveSde();
    const { rig, countsTowards } = await load().readTypeSynchronizer(
      96720,
      SYNCHRONIZER_GROUP,
    );
    expect(countsTowards).toEqual([]);
    expect(rig?.counterName).toBe("Dread Guristas Modules Fitted");
    expect(rig?.counterBase).toBe(0);
    expect(rig?.scaling).toHaveLength(8);
    expect(rig?.fixed.map(({ name, skills }) => [name, skills])).toEqual([
      ["Drawback", [skillRow.skill]],
      ["Drone Maximum Control Range Penalty", undefined],
    ]);
    expect(rig?.modules.map((module) => module.typeId)).toEqual([13965, 14246]);
  });

  it("asks only for published, live modules carrying the rig's feeder", async () => {
    serveSde();
    await load().readTypeSynchronizer(96720, SYNCHRONIZER_GROUP);
    expect(mockPrisma.typeEffect.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          effectId: { in: [12991] },
          isDeleted: false,
          type: { published: true, isDeleted: false },
        },
      }),
    );
  });

  it("looks for skills on the rig group's fixed attributes only", async () => {
    serveSde();
    await load().readTypeSynchronizer(96720, SYNCHRONIZER_GROUP);
    expect(mockPrisma.dogmaEffectModifier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          func: "LocationGroupModifier",
          groupId: SYNCHRONIZER_GROUP,
          operator: 6,
          modifiedAttributeId: { in: [1138, 6397] },
        }),
      }),
    );
  });

  it("reads the rigs a Caldari Navy module powers", async () => {
    serveSde();
    const { rig, countsTowards } = await load().readTypeSynchronizer(
      15681,
      367,
    );
    expect(rig).toBeNull();
    expect(countsTowards.map(({ name, amount }) => [name, amount])).toEqual([
      ["Small Caldari Navy Synchronizer", 1],
      ["Medium Caldari Navy Synchronizer", 1],
      ["Large Caldari Navy Synchronizer", 1],
    ]);
  });

  it("finds no rigs for a module whose group-wide add reaches none", async () => {
    serveSde();
    mockPrisma.type.findMany.mockResolvedValue([]);
    await expect(load().readTypeSynchronizer(15681, 367)).resolves.toEqual({
      rig: null,
      countsTowards: [],
    });
  });

  it("is not a rig when nothing feeds its counter", async () => {
    serveSde();
    const serve =
      mockPrisma.dogmaEffectModifier.findMany.getMockImplementation();
    mockPrisma.dogmaEffectModifier.findMany.mockImplementation((args) => {
      const where = (args as { where: Record<string, unknown> }).where;
      if (where.func === "LocationGroupModifier" && where.operator === 2) {
        return Promise.resolve([]);
      }
      return serve ? serve(args) : Promise.resolve([]);
    });
    await expect(
      load().readTypeSynchronizer(96720, SYNCHRONIZER_GROUP),
    ).resolves.toEqual({ rig: null, countsTowards: [] });
  });
});
