import type { ResolvedEffectDescription } from "~/lib/dogmaEffectDescription";

/**
 * Synchronizer rigs (Fractured Skies, November 2026) and the faction modules
 * that power them, as the SDE wires them up. Nothing here is hardcoded per
 * faction: the chain is read from dogma.
 *
 * - Each matching module has a passive effect that adds its own
 *   `rigSet<Faction>Module` value (1 on every module so far) to a counter
 *   attribute, `rigSet<Faction>Bonus`, on every rig of the synchronizer group
 *   fitted to the ship (`LocationGroupModifier`, modAdd). Passive effects apply
 *   as soon as the module is fitted, online or not.
 * - The rig has an effect that adds that counter to each of its bonus
 *   attributes (`ItemModifier` on itself), or subtracts it from those stored as
 *   negative percentages (a resistance bonus, a signature radius reduction), so
 *   both kinds grow. Those bonuses then reach the ship through the rig's
 *   ordinary effects.
 *
 * So each bonus moves a flat percentage point per module, which the expansion
 * notes describe as "a flat 1% for every … module fitted". The modules that
 * carry the effect are exactly the published modules named after the faction
 * ("Caldari Navy …"), the notes' "module of the same name".
 *
 * The penalties do not scale. The CPU drawback shrinks with the Synchronization
 * Rigging skill instead: the skill multiplies its own `rigDrawbackBonus` (-10)
 * by its level and applies it to the rig's drawback as a PostPercent, the
 * notes' "10% reduction in synchronizer rig CPU penalty" per level.
 */

/** Dogma operator 2: add the modifying value to the modified attribute. */
export const DOGMA_OPERATOR_MOD_ADD = 2;
/** Dogma operator 3: subtract the modifying value from it. */
export const DOGMA_OPERATOR_MOD_SUB = 3;
/** Dogma operator 6: raise the modified attribute by a percentage. */
export const DOGMA_OPERATOR_POST_PERCENT = 6;

/**
 * The inventory category of the rigs and of every module that feeds them
 * (Module). The page reads the chain only for items in it.
 */
export const SYNCHRONIZER_CATEGORY_ID = 7;

/** The highest level any skill trains to. */
export const MAX_SKILL_LEVEL = 5;

/** +1 for an attribute the counter is added to, -1 for one it is taken from. */
export type SynchronizerDirection = 1 | -1;

/** The direction a modAdd or modSub moves an attribute; null for others. */
export function operatorDirection(
  operator: number | null,
): SynchronizerDirection | null {
  if (operator === DOGMA_OPERATOR_MOD_ADD) return 1;
  if (operator === DOGMA_OPERATOR_MOD_SUB) return -1;
  return null;
}

/** A rig attribute, with what the page needs to show it. */
export interface SynchronizerAttribute {
  attributeId: number;
  /** Display name, else the internal name. */
  name: string;
  unitId?: number;
  unitSymbol?: string;
  /** The rig's own value: what it gives with no matching module fitted. */
  base: number;
  /**
   * What the attribute does once applied: one description per effect that
   * reads it, in effect order. The Dread Guristas Hitpoint Bonus has three,
   * one each for drones' shield, armor and structure.
   */
  appliesTo: ResolvedEffectDescription[];
  /** How the counter moves it; only set on the scaling attributes. */
  direction?: SynchronizerDirection;
  /** Skills that shrink it per level; only set on the fixed attributes. */
  skills?: SynchronizerSkill[];
}

/** A skill that changes a rig attribute by a percentage per trained level. */
export interface SynchronizerSkill {
  typeId: number;
  name: string;
  /** Applied per level as a PostPercent: -10 takes 10% off per level. */
  percentPerLevel: number;
}

/** A module whose fitting adds to a synchronizer's counter. */
export interface SynchronizerModule {
  typeId: number;
  name: string;
  groupId: number;
  groupName: string;
  /** How much this one module adds to the counter. */
  amount: number;
}

/** A synchronizer rig: what grows with matching modules, and what does not. */
export interface SynchronizerRig {
  /** The rig attribute the matching modules add to. */
  counterAttributeId: number;
  /** e.g. "Caldari Navy Modules Fitted". */
  counterName: string;
  /** The counter's own value before any module adds to it (0 in the SDE). */
  counterBase: number;
  /** Bonuses the counter is added to. */
  scaling: SynchronizerAttribute[];
  /** The rig's other applied attributes (its penalties, CPU drawback…). */
  fixed: SynchronizerAttribute[];
  /** Published modules that add to the counter, by group then name. */
  modules: SynchronizerModule[];
}

/** A synchronizer rig a module counts towards. */
export interface SynchronizerTarget {
  typeId: number;
  name: string;
  /** e.g. "Caldari Navy Modules Fitted". */
  counterName: string;
  /** How much fitting this module adds to that rig's counter. */
  amount: number;
}

/** A type's place in the synchronizer chain, from either end. */
export interface TypeSynchronizer {
  /** Set when the type is itself a synchronizer rig. */
  rig: SynchronizerRig | null;
  /** The rigs this type powers, when it is a matching module. */
  countsTowards: SynchronizerTarget[];
}

export const emptyTypeSynchronizer: TypeSynchronizer = {
  rig: null,
  countsTowards: [],
};

export function hasSynchronizer(value: TypeSynchronizer): boolean {
  return value.rig !== null || value.countsTowards.length > 0;
}

/** The rig's counter once `moduleCount` matching modules have added to it. */
export function synchronizerCounter(
  modules: readonly Pick<SynchronizerModule, "amount">[],
  moduleCount: number,
  counterBase = 0,
): number {
  return counterBase + moduleCount * perModuleAmount(modules);
}

/**
 * An attribute after a skill's per-level PostPercent: the drawback of -10 at
 * Synchronization Rigging V is -10 × (1 + (-10 × 5) / 100) = -5.
 */
export function skillAdjustedValue(
  base: number,
  percentPerLevel: number,
  level: number,
): number {
  return base * (1 + (percentPerLevel * level) / 100);
}

/**
 * What each matching module adds. Every module in the SDE today adds 1; should
 * CCP ever vary it, the most common amount stands in, so the count still reads
 * as "modules fitted".
 */
export function perModuleAmount(
  modules: readonly Pick<SynchronizerModule, "amount">[],
): number {
  const tally = new Map<number, number>();
  for (const { amount } of modules) {
    tally.set(amount, (tally.get(amount) ?? 0) + 1);
  }
  let best = 1;
  let bestCount = 0;
  for (const [amount, count] of tally) {
    if (count > bestCount || (count === bestCount && amount < best)) {
      best = amount;
      bestCount = count;
    }
  }
  return best;
}

/** A bonus's value once the rig applies `counter` to it, as the game does. */
export function synchronizedValue(
  base: number,
  counter: number,
  direction: SynchronizerDirection = 1,
): number {
  return base + direction * counter;
}

/**
 * Whether each module makes this bonus stronger. Every Synchronizer in the SDE
 * today pairs a positive bonus with an add and a negative one with a subtract,
 * so all of them grow; one paired the other way would move towards zero.
 */
export function synchronizerTrend(
  base: number,
  amountPerModule: number,
  direction: SynchronizerDirection = 1,
): "grows" | "shrinks" {
  const step = direction * amountPerModule;
  if (base === 0 || step === 0) return "grows";
  return Math.sign(base) === Math.sign(step) ? "grows" : "shrinks";
}

/**
 * The module count at which a shrinking bonus reaches zero and starts turning
 * into a penalty; null for a bonus that grows.
 */
export function synchronizerZeroAt(
  base: number,
  amountPerModule: number,
  direction: SynchronizerDirection = 1,
): number | null {
  if (synchronizerTrend(base, amountPerModule, direction) === "grows") {
    return null;
  }
  return Math.ceil(Math.abs(base / amountPerModule));
}
