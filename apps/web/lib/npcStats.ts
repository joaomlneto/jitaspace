/**
 * Combat figures for an NPC or a drone, from its dogma attributes and effects:
 * the weapons it fires, its hit points and resistances, how it flies, and what
 * else it does (electronic warfare, remote repair, mining, salvaging). Pure, so
 * it can be unit-tested against the numbers players know.
 */

export type DamageType = "em" | "thermal" | "kinetic" | "explosive";
export const DAMAGE_TYPES: readonly DamageType[] = [
  "em",
  "thermal",
  "kinetic",
  "explosive",
];

/** Dogma attribute ids, by what they mean. */
const ATTR = {
  damage: { em: 114, thermal: 118, kinetic: 117, explosive: 116 },
  turretDamageMultiplier: 64,
  turretRateOfFire: 51,
  turretOptimalRange: 54,
  turretFalloff: 158,
  turretTrackingSpeed: 160,
  missileTypeId: 507,
  missileDamageMultiplier: 212,
  missileRateOfFire: 506,
  shieldHp: 263,
  armorHp: 265,
  structureHp: 9,
  shieldResonance: { em: 271, thermal: 274, kinetic: 273, explosive: 272 },
  armorResonance: { em: 267, thermal: 270, kinetic: 269, explosive: 268 },
  structureResonance: { em: 113, thermal: 110, kinetic: 109, explosive: 111 },
  attackRange: 247,
  orbitRange: 416,
  orbitSpeed: 508,
  chaseSpeed: 37,
  signatureRadius: 552,
  scanResolution: 564,
} as const;

export type Attributes = ReadonlyMap<number, number>;
export type Effects = ReadonlySet<number>;

export type PerDamageType = Record<DamageType, number>;

export interface NpcWeapon {
  kind: "turret" | "missile";
  /** Damage per volley, multiplier applied. */
  volley: PerDamageType;
  /** Seconds between volleys. */
  cycleSeconds: number;
  /** The missile it launches. */
  missileTypeId?: number;
  /** Turrets only: metres, metres and radians per second. */
  optimalRange?: number;
  falloff?: number;
  trackingSpeed?: number;
}

export interface NpcLayer {
  hp: number;
  /** 0 to 1 per damage type. */
  resists: PerDamageType;
  /** Effective hit points against an even spread of the four damage types. */
  ehp: number;
}

export interface NpcEwarValue {
  label: string;
  value: number;
  unit: string;
}

export interface NpcEwar {
  /** A module that does the same, for its icon. */
  iconTypeId: number;
  label: string;
  values: NpcEwarValue[];
}

export interface NpcStats {
  weapons: NpcWeapon[];
  /** Summed over its weapons; undefined for an NPC that does no damage. */
  alpha?: PerDamageType;
  dps?: PerDamageType;
  shield: NpcLayer;
  armor: NpcLayer;
  structure: NpcLayer;
  attackRange?: number;
  orbitRange?: number;
  orbitSpeed?: number;
  chaseSpeed?: number;
  signatureRadius?: number;
  scanResolution?: number;
  ewar: NpcEwar[];
}

const perType = (value: (type: DamageType) => number): PerDamageType => ({
  em: value("em"),
  thermal: value("thermal"),
  kinetic: value("kinetic"),
  explosive: value("explosive"),
});

export const sumDamage = (damage: PerDamageType) =>
  DAMAGE_TYPES.reduce((sum, type) => sum + damage[type], 0);

const volleyOf = (attributes: Attributes, multiplier: number) =>
  perType((type) => (attributes.get(ATTR.damage[type]) ?? 0) * multiplier);

/**
 * A layer's hit points and resistances. A resonance the NPC does not have is
 * 1, the attribute's default: no resistance.
 */
const layer = (
  attributes: Attributes,
  hpAttribute: number,
  resonance: Record<DamageType, number>,
): NpcLayer => {
  const hp = attributes.get(hpAttribute) ?? 0;
  const resonances = perType((type) => attributes.get(resonance[type]) ?? 1);
  const meanResonance = sumDamage(resonances) / DAMAGE_TYPES.length;
  return {
    hp,
    resists: perType((type) => 1 - resonances[type]),
    ehp: meanResonance > 0 ? hp / meanResonance : hp,
  };
};

interface EwarSpec {
  iconTypeId: number;
  label: string;
  /**
   * Only for a type with this dogma effect. Drones (and newer NPCs) describe
   * what they do with generic attributes, such as range 54 and duration 73,
   * that a turret NPC also carries, so the effect is what says which applies.
   */
  effectId?: number;
  /**
   * Only for a type with at least one of these attributes: keeps out an
   * effect that only has a stray one (speedFactor alone is on many NPCs that
   * never web).
   */
  requires?: number[];
  values: {
    attributeId: number;
    label: string;
    unit: string;
    scale?: number;
  }[];
}

const MS = 1 / 1000;
const rangeAndDuration = [
  { attributeId: 54, label: "Range", unit: "m" },
  { attributeId: 73, label: "Duration", unit: "s", scale: MS },
];

/**
 * Electronic warfare and support, each with the attributes that describe it.
 * The first entries are the attributes NPCs have long used; the effect-keyed
 * ones after them are what drones (and newer NPCs) use.
 */
const EWAR: EwarSpec[] = [
  {
    iconTypeId: 526,
    label: "Stasis Webifier",
    requires: [513, 514],
    values: [
      { attributeId: 514, label: "Range", unit: "m" },
      { attributeId: 513, label: "Duration", unit: "s", scale: MS },
      { attributeId: 20, label: "Velocity", unit: "%" },
    ],
  },
  {
    iconTypeId: 447,
    label: "Warp Scrambler",
    values: [
      { attributeId: 103, label: "Range", unit: "m" },
      { attributeId: 505, label: "Duration", unit: "s", scale: MS },
      { attributeId: 105, label: "Strength", unit: "" },
    ],
  },
  {
    iconTypeId: 533,
    label: "Energy Neutralizer",
    values: [
      { attributeId: 98, label: "Range", unit: "m" },
      { attributeId: 942, label: "Duration", unit: "s", scale: MS },
      { attributeId: 97, label: "Amount", unit: "GJ" },
    ],
  },
  {
    iconTypeId: 12709,
    label: "Target Painter",
    values: [
      { attributeId: 941, label: "Range", unit: "m" },
      { attributeId: 954, label: "Falloff", unit: "m" },
      { attributeId: 945, label: "Duration", unit: "s", scale: MS },
    ],
  },
  {
    iconTypeId: 1957,
    label: "ECM Jammer",
    requires: [929, 936],
    values: [
      { attributeId: 936, label: "Range", unit: "m" },
      { attributeId: 929, label: "Duration", unit: "s", scale: MS },
      { attributeId: 2822, label: "Jam duration", unit: "s", scale: MS },
      { attributeId: 238, label: "Gravimetric strength", unit: "" },
      { attributeId: 239, label: "Ladar strength", unit: "" },
      { attributeId: 240, label: "Magnetometric strength", unit: "" },
      { attributeId: 241, label: "Radar strength", unit: "" },
    ],
  },
  {
    iconTypeId: 27678,
    label: "Remote ECM Burst",
    values: [
      { attributeId: 1658, label: "Duration", unit: "s", scale: MS },
      { attributeId: 1659, label: "Min. duration", unit: "s", scale: MS },
    ],
  },
  {
    iconTypeId: 3586,
    label: "Remote Shield Repair",
    values: [
      { attributeId: 1464, label: "Range", unit: "m" },
      { attributeId: 1460, label: "Amount", unit: "HP" },
      { attributeId: 1458, label: "Duration", unit: "s", scale: MS },
    ],
  },
  {
    iconTypeId: 20124,
    label: "Fleet Shield Resistance Bonus",
    values: [{ attributeId: 1671, label: "Bonus", unit: "%" }],
  },
  {
    iconTypeId: 526,
    label: "Stasis Webifier",
    effectId: 6690,
    values: [
      ...rangeAndDuration,
      { attributeId: 20, label: "Velocity", unit: "%" },
    ],
  },
  {
    iconTypeId: 12709,
    label: "Target Painter",
    effectId: 6692,
    values: [
      ...rangeAndDuration,
      { attributeId: 554, label: "Signature radius", unit: "%" },
    ],
  },
  {
    iconTypeId: 1968,
    label: "Sensor Dampener",
    effectId: 6693,
    values: [
      ...rangeAndDuration,
      { attributeId: 309, label: "Lock range", unit: "%" },
      { attributeId: 566, label: "Scan resolution", unit: "%" },
    ],
  },
  {
    iconTypeId: 2108,
    label: "Weapon Disruptor",
    effectId: 6694,
    values: [
      ...rangeAndDuration,
      { attributeId: 351, label: "Optimal range", unit: "%" },
      { attributeId: 349, label: "Falloff", unit: "%" },
      { attributeId: 767, label: "Tracking", unit: "%" },
    ],
  },
  {
    iconTypeId: 11355,
    label: "Remote Armor Repair",
    effectId: 6687,
    values: [
      ...rangeAndDuration,
      { attributeId: 84, label: "Amount", unit: "HP" },
    ],
  },
  {
    iconTypeId: 3586,
    label: "Remote Shield Booster",
    effectId: 6688,
    values: [
      ...rangeAndDuration,
      { attributeId: 68, label: "Amount", unit: "HP" },
    ],
  },
  {
    iconTypeId: 27932,
    label: "Remote Hull Repair",
    effectId: 6689,
    values: [
      ...rangeAndDuration,
      { attributeId: 83, label: "Amount", unit: "HP" },
    ],
  },
  {
    iconTypeId: 483,
    label: "Mining",
    effectId: 17,
    values: [
      ...rangeAndDuration,
      { attributeId: 77, label: "Amount", unit: "m³" },
    ],
  },
  {
    iconTypeId: 25861,
    label: "Salvaging",
    effectId: 5163,
    values: [
      ...rangeAndDuration,
      { attributeId: 902, label: "Access difficulty bonus", unit: "%" },
    ],
  },
];

/** The NPC's turrets, if it has any that do damage. */
function turretWeapon(attributes: Attributes): NpcWeapon | undefined {
  const rateOfFire = attributes.get(ATTR.turretRateOfFire);
  if (!rateOfFire) return undefined;
  const volley = volleyOf(
    attributes,
    attributes.get(ATTR.turretDamageMultiplier) ?? 1,
  );
  if (sumDamage(volley) <= 0) return undefined;
  return {
    kind: "turret",
    volley,
    cycleSeconds: rateOfFire / 1000,
    optimalRange: attributes.get(ATTR.turretOptimalRange),
    falloff: attributes.get(ATTR.turretFalloff),
    trackingSpeed: attributes.get(ATTR.turretTrackingSpeed),
  };
}

/** The NPC's missile launchers; damage comes from the missile's attributes. */
function missileWeapon(
  attributes: Attributes,
  missileAttributes: Attributes | undefined,
): NpcWeapon | undefined {
  const missileTypeId = attributes.get(ATTR.missileTypeId);
  const rateOfFire = attributes.get(ATTR.missileRateOfFire);
  if (!missileTypeId || !rateOfFire || !missileAttributes) return undefined;
  const volley = volleyOf(
    missileAttributes,
    attributes.get(ATTR.missileDamageMultiplier) ?? 1,
  );
  if (sumDamage(volley) <= 0) return undefined;
  return {
    kind: "missile",
    volley,
    cycleSeconds: rateOfFire / 1000,
    missileTypeId,
  };
}

/** Per damage type, summed over the weapons; undefined without any. */
const sumOverWeapons = (
  weapons: readonly NpcWeapon[],
  perWeapon: (weapon: NpcWeapon, type: DamageType) => number,
): PerDamageType | undefined =>
  weapons.length === 0
    ? undefined
    : perType((type) =>
        weapons.reduce((sum, weapon) => sum + perWeapon(weapon, type), 0),
      );

/** What the NPC does besides shooting: e-war, repairs, mining. */
function ewarOf(attributes: Attributes, effects: Effects): NpcEwar[] {
  const ewar: NpcEwar[] = [];
  for (const spec of EWAR) {
    if (spec.effectId !== undefined && !effects.has(spec.effectId)) continue;
    if (spec.requires && !spec.requires.some((id) => attributes.has(id))) {
      continue;
    }
    // The same effect described both ways: keep the first.
    if (ewar.some((e) => e.label === spec.label)) continue;
    const values = spec.values.flatMap(
      ({ attributeId, label, unit, scale }) => {
        const raw = attributes.get(attributeId);
        return raw === undefined
          ? []
          : [{ label, unit, value: raw * (scale ?? 1) }];
      },
    );
    if (values.length > 0) {
      ewar.push({ iconTypeId: spec.iconTypeId, label: spec.label, values });
    }
  }
  return ewar;
}

/**
 * An NPC's or drone's combat figures. Turret damage sits on the type itself;
 * missile damage on the missile it launches, so pass that missile's
 * attributes. Pass its dogma effects for what drones do besides shooting.
 */
export function computeNpcStats(
  attributes: Attributes,
  missileAttributes?: Attributes,
  effects: Effects = new Set(),
): NpcStats {
  const weapons = [
    turretWeapon(attributes),
    missileWeapon(attributes, missileAttributes),
  ].filter((weapon): weapon is NpcWeapon => weapon !== undefined);
  const alpha = sumOverWeapons(weapons, (weapon, type) => weapon.volley[type]);
  const dps = sumOverWeapons(
    weapons,
    (weapon, type) => weapon.volley[type] / weapon.cycleSeconds,
  );
  const ewar = ewarOf(attributes, effects);

  return {
    weapons,
    alpha,
    dps,
    shield: layer(attributes, ATTR.shieldHp, ATTR.shieldResonance),
    armor: layer(attributes, ATTR.armorHp, ATTR.armorResonance),
    structure: layer(attributes, ATTR.structureHp, ATTR.structureResonance),
    attackRange: attributes.get(ATTR.attackRange),
    orbitRange: attributes.get(ATTR.orbitRange),
    orbitSpeed: attributes.get(ATTR.orbitSpeed),
    chaseSpeed: attributes.get(ATTR.chaseSpeed),
    signatureRadius: attributes.get(ATTR.signatureRadius),
    scanResolution: attributes.get(ATTR.scanResolution),
    ewar,
  };
}

/** Whether there is anything to show: a weapon, an effect or hit points. */
export const hasCombatStats = (stats: NpcStats) =>
  stats.weapons.length > 0 ||
  stats.ewar.length > 0 ||
  stats.shield.hp + stats.armor.hp + stats.structure.hp > 0;

/** The attribute ids {@link computeNpcStats} reads, to query only those. */
export const NPC_STAT_ATTRIBUTE_IDS: readonly number[] = [
  ...new Set([
    ...Object.values(ATTR.damage),
    ATTR.turretDamageMultiplier,
    ATTR.turretRateOfFire,
    ATTR.turretOptimalRange,
    ATTR.turretFalloff,
    ATTR.turretTrackingSpeed,
    ATTR.missileTypeId,
    ATTR.missileDamageMultiplier,
    ATTR.missileRateOfFire,
    ATTR.shieldHp,
    ATTR.armorHp,
    ATTR.structureHp,
    ...Object.values(ATTR.shieldResonance),
    ...Object.values(ATTR.armorResonance),
    ...Object.values(ATTR.structureResonance),
    ATTR.attackRange,
    ATTR.orbitRange,
    ATTR.orbitSpeed,
    ATTR.chaseSpeed,
    ATTR.signatureRadius,
    ATTR.scanResolution,
    ...EWAR.flatMap((spec) => spec.values.map((v) => v.attributeId)),
  ]),
];

/** The dogma effects {@link computeNpcStats} reads, to query only those. */
export const NPC_STAT_EFFECT_IDS: readonly number[] = EWAR.flatMap((spec) =>
  spec.effectId === undefined ? [] : [spec.effectId],
);

/** The attribute that names the missile an NPC launches. */
export const MISSILE_TYPE_ATTRIBUTE_ID = ATTR.missileTypeId;
