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

/** A raw dogma value and its unit; the client formats it for display. */
export interface NpcEwarValue {
  label: string;
  value: number;
  unitId?: number;
  unitSymbol?: string;
}

/** Something an NPC does besides shooting: e-war, repairs, mining. */
export interface NpcEwar {
  /** The dogma effect it comes from. */
  effectId: number;
  label: string;
  /** A module that does the same, for its icon; none for an unknown effect. */
  iconTypeId?: number;
  values: NpcEwarValue[];
}

/** What the SDE says about a dogma effect: the attributes it reads. */
export interface DogmaEffectInfo {
  effectId: number;
  /** Its internal name ("remoteWebifierEntity"): a label of last resort. */
  name: string;
  isOffensive: boolean;
  isAssistance: boolean;
  rangeAttributeId: number | null;
  falloffAttributeId: number | null;
  durationAttributeId: number | null;
  /** The attributes its modifiers apply: how hard it hits. */
  modifyingAttributeIds: readonly number[];
}

/** What the SDE says about a dogma attribute, for its label and unit. */
export interface DogmaAttributeInfo {
  name: string;
  displayName: string | null;
  unitId: number | null;
  unitSymbol: string | null;
}

/** The dogma a type's abilities are read from: its effects, and attribute names. */
export interface NpcDogma {
  /** The effects the type carries. */
  effects: readonly DogmaEffectInfo[];
  /** {@link INFERRED_EFFECT_IDS}, for types that lack them but act on them. */
  inferableEffects?: readonly DogmaEffectInfo[];
  attributeInfo: ReadonlyMap<number, DogmaAttributeInfo>;
}

const NO_DOGMA: NpcDogma = { effects: [], attributeInfo: new Map() };

/**
 * Old-style ("entity") NPC electronic warfare the game drives from the
 * attributes alone: some NPCs that use it in space do not carry the effect
 * (Lirsautton Parichaya jams with no ECM effect). Such a type counts as having
 * the effect when it has every attribute the effect points at, none of them 0.
 */
export const INFERRED_EFFECT_IDS: readonly number[] = [
  563, 575, 1879, 3855, 4656, 4686, 6691, 6695,
];

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

interface AbilitySpec {
  label: string;
  iconTypeId: number;
  /**
   * How hard it hits, for an effect the game implements in code: its
   * modifiers do not say. The label and unit come from the attribute unless
   * given here.
   */
  strengths?: readonly {
    attributeId: number;
    label?: string;
    unitId?: number;
    unitSymbol?: string;
  }[];
}

const WEB = { label: "Stasis Webifier", iconTypeId: 526 };
const SCRAMBLER = { label: "Warp Scrambler", iconTypeId: 447 };
const DISRUPTOR = { label: "Warp Disruptor", iconTypeId: 3242 };
const NEUTRALIZER = { label: "Energy Neutralizer", iconTypeId: 533 };
const PAINTER = { label: "Target Painter", iconTypeId: 12709 };
const DAMPENER = { label: "Sensor Dampener", iconTypeId: 1968 };
const TRACKING_DISRUPTOR = { label: "Tracking Disruptor", iconTypeId: 2108 };
const ECM = {
  label: "ECM Jammer",
  iconTypeId: 1957,
  strengths: [2822, 238, 239, 240, 241].map((attributeId) => ({ attributeId })),
};
const REMOTE_ARMOR = { label: "Remote Armor Repair", iconTypeId: 11355 };
const REMOTE_SHIELD = { label: "Remote Shield Repair", iconTypeId: 3586 };
const MINING = { label: "Mining", iconTypeId: 483 };
/** The code-implemented NPC remote repairs keep their amount and range here. */
const NPC_REPAIR_STRENGTHS = (amountAttributeId: number) => [
  { attributeId: 1464, label: "Range", unitId: 1, unitSymbol: "m" },
  { attributeId: amountAttributeId, label: "Amount", unitSymbol: "HP" },
];

/**
 * Names and icons for the effects NPCs and drones use: the SDE gives most of
 * them neither (their names are internal, like "remoteWebifierEntity"). What
 * each does, and how far and how long, comes from the effect itself. An
 * offensive or assisting effect missing here still shows, by its own name.
 */
const ABILITIES: Partial<Record<number, AbilitySpec>> = {
  575: WEB,
  3714: WEB,
  6743: WEB,
  6690: { ...WEB, strengths: [{ attributeId: 20 }] },
  563: SCRAMBLER,
  2481: SCRAMBLER,
  3713: SCRAMBLER,
  5928: SCRAMBLER,
  6745: SCRAMBLER,
  39: DISRUPTOR,
  6744: DISRUPTOR,
  6691: { ...NEUTRALIZER, strengths: [{ attributeId: 97 }] },
  6187: { ...NEUTRALIZER, strengths: [{ attributeId: 97 }] },
  6756: { ...NEUTRALIZER, strengths: [{ attributeId: 97 }] },
  6882: { label: "Energy Nosferatu", iconTypeId: 530 },
  1879: PAINTER,
  6754: PAINTER,
  6692: { ...PAINTER, strengths: [{ attributeId: 554 }] },
  1878: DAMPENER,
  6755: DAMPENER,
  6693: {
    ...DAMPENER,
    strengths: [{ attributeId: 309 }, { attributeId: 566 }],
  },
  6747: TRACKING_DISRUPTOR,
  6846: TRACKING_DISRUPTOR,
  6694: {
    label: "Weapon Disruptor",
    iconTypeId: 2108,
    strengths: [
      { attributeId: 351 },
      { attributeId: 349 },
      { attributeId: 767 },
    ],
  },
  6746: { label: "Guidance Disruptor", iconTypeId: 37543 },
  6695: ECM,
  3710: ECM,
  6757: ECM,
  4656: {
    label: "Remote ECM Burst",
    iconTypeId: 27678,
    strengths: [{ attributeId: 1659, label: "Min. duration", unitId: 101 }],
  },
  592: REMOTE_ARMOR,
  6741: REMOTE_ARMOR,
  6687: { ...REMOTE_ARMOR, strengths: [{ attributeId: 84 }] },
  3852: { ...REMOTE_ARMOR, strengths: NPC_REPAIR_STRENGTHS(1455) },
  6165: { ...REMOTE_ARMOR, strengths: NPC_REPAIR_STRENGTHS(1455) },
  6742: REMOTE_SHIELD,
  6688: { ...REMOTE_SHIELD, strengths: [{ attributeId: 68 }] },
  3855: { ...REMOTE_SHIELD, strengths: NPC_REPAIR_STRENGTHS(1460) },
  6689: {
    label: "Remote Hull Repair",
    iconTypeId: 27932,
    strengths: [{ attributeId: 83 }],
  },
  12073: { label: "Remote Capacitor Transmitter", iconTypeId: 529 },
  4686: {
    label: "Fleet Shield Resistance Bonus",
    iconTypeId: 42529,
    // A plain percentage, though its unit says multiplier: -20, not 0.8.
    strengths: [{ attributeId: 1671, unitSymbol: "%" }],
  },
  4687: { label: "Fleet Speed Bonus", iconTypeId: 42530 },
  4688: { label: "Fleet Propulsion Jamming Bonus", iconTypeId: 42530 },
  4689: { label: "Fleet Armor Resistance Bonus", iconTypeId: 42526 },
  17: { ...MINING, strengths: [{ attributeId: 77 }] },
  6901: MINING,
  5163: {
    label: "Salvaging",
    iconTypeId: 25861,
    strengths: [{ attributeId: 902 }],
  },
  7188: { label: "Smart Bomb", iconTypeId: 1563 },
};

/** Weapons and superweapons: the damage model covers them, not the abilities. */
const WEAPON_EFFECT_IDS = new Set([10, 569, 6042, 6995, 8088, 11716]);

const RANGE_UNIT = { unitId: 1, unitSymbol: "m" };
/** Every NPC duration is in milliseconds, whatever unit its attribute claims. */
const DURATION_UNIT = { unitId: 101 };

/** A value with only the unit fields it has. */
const valueOf = (
  label: string,
  value: number,
  unit: { unitId?: number; unitSymbol?: string },
): NpcEwarValue => ({
  label,
  value,
  ...(unit.unitId === undefined ? {} : { unitId: unit.unitId }),
  ...(unit.unitSymbol ? { unitSymbol: unit.unitSymbol } : {}),
});

/** "behaviorWarpScrambleStrength" → "Warp scramble strength". */
const humanize = (name: string) => {
  const words = name
    .replace(/^(behavior|entity|npc)(?=[A-Z])/i, "")
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** An ability's range, falloff and duration, then how hard it hits. */
function abilityValues(
  effect: DogmaEffectInfo,
  spec: AbilitySpec | undefined,
  attributes: Attributes,
  attributeInfo: NpcDogma["attributeInfo"],
): NpcEwarValue[] {
  const values: NpcEwarValue[] = [];
  const roles = [
    ["Range", effect.rangeAttributeId, RANGE_UNIT],
    ["Falloff", effect.falloffAttributeId, RANGE_UNIT],
    ["Duration", effect.durationAttributeId, DURATION_UNIT],
  ] as const;
  for (const [label, attributeId, unit] of roles) {
    const value =
      attributeId === null ? undefined : attributes.get(attributeId);
    // A range, falloff or duration of 0 says nothing ("Falloff 0 m").
    if (value) values.push(valueOf(label, value, unit));
  }
  const shown = new Set<number>(
    roles.flatMap(([, id]) => (id === null ? [] : [id])),
  );
  const strengths: NonNullable<AbilitySpec["strengths"]> = [
    ...effect.modifyingAttributeIds.map((attributeId) => ({ attributeId })),
    ...(spec?.strengths ?? []),
  ];
  for (const strength of strengths) {
    const value = attributes.get(strength.attributeId);
    if (value === undefined || shown.has(strength.attributeId)) continue;
    shown.add(strength.attributeId);
    const info = attributeInfo.get(strength.attributeId);
    // Many NPC attributes have an empty display name, not a missing one.
    const displayName =
      info?.displayName === "" ? undefined : info?.displayName;
    const label =
      strength.label ??
      displayName ??
      humanize(info?.name ?? `attribute ${strength.attributeId}`);
    const unit =
      strength.unitId !== undefined || strength.unitSymbol !== undefined
        ? strength
        : {
            unitId: info?.unitId ?? undefined,
            unitSymbol: info?.unitSymbol ?? undefined,
          };
    values.push(valueOf(label, value, unit));
  }
  return values;
}

/**
 * What the NPC does besides shooting: every effect it carries that is in
 * {@link ABILITIES}, or that the SDE marks offensive or assisting, with the
 * values it has. Two effects doing the same thing show once.
 */
function abilitiesOf(attributes: Attributes, dogma: NpcDogma): NpcEwar[] {
  const abilities: NpcEwar[] = [];
  const carried = new Set(dogma.effects.map((effect) => effect.effectId));
  const inferred = (dogma.inferableEffects ?? []).filter((effect) => {
    if (carried.has(effect.effectId)) return false;
    const pointers = [
      effect.rangeAttributeId,
      effect.falloffAttributeId,
      effect.durationAttributeId,
    ].filter((id) => id !== null);
    return pointers.length > 0 && pointers.every((id) => !!attributes.get(id));
  });
  // What the type carries goes first: an inferred old-style effect only fills
  // in an ability nothing it carries already shows.
  const byId = (a: DogmaEffectInfo, b: DogmaEffectInfo) =>
    a.effectId - b.effectId;
  const effects = [...[...dogma.effects].sort(byId), ...inferred.sort(byId)];
  for (const effect of effects) {
    if (WEAPON_EFFECT_IDS.has(effect.effectId)) continue;
    const spec = ABILITIES[effect.effectId];
    if (!spec && !effect.isOffensive && !effect.isAssistance) continue;
    const label = spec?.label ?? humanize(effect.name);
    if (abilities.some((ability) => ability.label === label)) continue;
    const values = abilityValues(effect, spec, attributes, dogma.attributeInfo);
    if (values.length > 0) {
      abilities.push({
        effectId: effect.effectId,
        label,
        iconTypeId: spec?.iconTypeId,
        values,
      });
    }
  }
  return abilities;
}

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

/**
 * An NPC's or drone's combat figures. Turret damage sits on the type itself;
 * missile damage on the missile it launches, so pass that missile's
 * attributes. Pass its dogma effects for what drones do besides shooting.
 */
export function computeNpcStats(
  attributes: Attributes,
  missileAttributes?: Attributes,
  dogma: NpcDogma = NO_DOGMA,
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
  const ewar = abilitiesOf(attributes, dogma);

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

/** The attributes the damage, tank and navigation figures read. */
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
  ]),
];

/** The inventory category NPCs belong to ("Entity"). */
export const NPC_CATEGORY_ID = 11;
/** The inventory category drones belong to (not fighters, which have their own). */
export const DRONE_CATEGORY_ID = 18;
/**
 * The categories whose combat figures come from their own attributes. Not
 * ships: a ship's damage comes from the modules fitted to it.
 */
export const COMBAT_STATS_CATEGORY_IDS: readonly number[] = [
  NPC_CATEGORY_ID,
  DRONE_CATEGORY_ID,
];

/**
 * The attributes an ability may label from the SDE: those its effect's
 * modifiers apply, and those {@link ABILITIES} lists. Only these need a name
 * and unit read.
 */
export const abilityAttributeIds = (
  effects: readonly DogmaEffectInfo[],
): number[] => [
  ...new Set(
    effects.flatMap((effect) => [
      ...effect.modifyingAttributeIds,
      ...(ABILITIES[effect.effectId]?.strengths ?? []).map(
        (strength) => strength.attributeId,
      ),
    ]),
  ),
];

/** The attribute that names the missile an NPC launches. */
export const MISSILE_TYPE_ATTRIBUTE_ID = ATTR.missileTypeId;
