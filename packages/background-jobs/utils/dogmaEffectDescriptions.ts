/**
 * The rules and checks behind DogmaEffect.customDescription, shared by
 * scripts/describe-dogma-effects.ts and its tests: the prompt Claude writes
 * from, the input it gets, how a modifier's direction is read, and what a
 * finished description may contain.
 */

import { checkLinkedDescription } from "./linkedDescriptions";

export { label } from "./linkedDescriptions";

export const BOILERPLATE = "Automatically generated effect";
export const SKILL_CATEGORY_ID = 16;
/** Resonance unit: a lower value means more resistance. */
export const RESONANCE_UNIT_ID = 108;

export const SYSTEM_PROMPT = `You write short descriptions of EVE Online dogma effects for JitaSpace, a reference website. CCP gave these effects no description. Players read your text directly above the effect's raw modifier data, and the page lists every item that has the effect together with its own value.

Write one or two sentences, about 150 and never more than 240 visible characters. Say what the effect does in game terms: what changes, on which items, and in which direction.

Format: plain text with links, and no other markup. Link the first mention of each skill, item, group, attribute and effect you name, using its id from the input and exactly one of these forms:
- a skill or item type: <a href="showinfo:TYPEID">Name</a>
- a group: <a href="/group/GROUPID">Name</a>
- a dogma attribute: <a href="/dogma/attribute/ATTRIBUTEID">Name</a>
- a dogma effect: <a href="/dogma/effect/EFFECTID">Name</a>
Only link ids that appear in the input. Never write other tags, entities or markdown.

Rules:
- Use only the data provided. Do not add game mechanics that are not in it (warp core stability, stacking penalties, overheating, capacitor use, how or when a module is activated). If the data cannot tell you something, leave it out.
- No numbers: no values, ranges, percentages, multipliers or counts. The page shows each item's value.
- Never name or describe the items that have the effect: no "carried by", "found on" or "used by", and no ship, module, implant, skill or NPC names for them. Call the item with the effect "the item", "the module", "the implant", "the skill" and so on.
- Name attributes by their display name. Use an internal camelCase name only when it is the only name there is.
- Do not begin with "This effect", and do not repeat the effect's internal name.
- direction says what the effect does to the modified attribute as players see it: "increases", "decreases", "increases or decreases" (it depends on the item), or "sets" (it overrides the value). Use it for your verb. When it is null, say the attribute is changed or modified.
- When scalesWithSkills lists a skill, the bonus grows with that skill's level: say it applies "per <a href="showinfo:TYPEID">Skill Name</a> level" (with several skills, name each, joined by "or"). When itemsAreSkills is true, the bonus applies per skill level.
- Say only what the effect does. Do not restate its flags or the attributes under usesAttributes unless they are needed to explain it, and do not state what the effect does not do.

How to read a modifier:
- domain says where the targets are. shipID: the hull the item is fitted to (normally a ship; for starbase modules, the control tower; for structure modules, the structure). structureID: the structure. charID: the pilot. itemID: the item that has the effect itself, not the ship. otherID: the charge loaded in this module, or the module this charge is loaded in. targetID and target: whatever the item is activated on.
- func says which items. ItemModifier: the domain itself. LocationModifier: everything fitted to or located in the domain. LocationGroupModifier: items of the given group in the domain. LocationRequiredSkillModifier: items in the domain that require the given skill. OwnerRequiredSkillModifier: items owned by the pilot that require the given skill, wherever they are, including drones, missiles and fighters in space. EffectStopper: stops the named effect on the domain and changes no attribute.
- operation, in the order dogma applies them: PreAssign sets the base value; PreMul multiplies; PreDiv divides; ModAdd adds; ModSub subtracts; PostMul multiplies; PostDiv divides; PostPercent changes by a percentage; PostAssign overrides the final value.

Reply with the description only.`;

export const OPERATIONS: Record<number, string> = {
  [-1]: "PreAssign",
  0: "PreMul",
  1: "PreDiv",
  2: "ModAdd",
  3: "ModSub",
  4: "PostMul",
  5: "PostDiv",
  6: "PostPercent",
  7: "PostAssign",
};

export interface Ref {
  id: number;
  name: string;
}

export interface ModifierInput {
  func: string;
  domain: string | null;
  operation: string | null;
  modifiedAttribute: Ref | null;
  modifyingAttribute: Ref | null;
  direction: string | null;
  /** Ship skills whose trained level multiplies the bonus; usually none or one. */
  scalesWithSkills: Ref[];
  group: Ref | null;
  skill: Ref | null;
  stoppedEffect: Ref | null;
}

export interface EffectInput {
  effectId: number;
  effect: {
    internalName: string | null;
    displayName: string | null;
    category: string | null;
    trueFlags: string[];
    usesAttributes: Record<string, Ref>;
  };
  modifiers: ModifierInput[];
  itemsAreSkills: boolean;
}

export interface Result {
  effectId: number;
  description: string;
}

/** What a modifier does to the modified attribute, as players read it. */
export function directionOf(
  operator: number | null,
  values: number[],
  modifiedUnitId: number | null,
): string | null {
  if (operator === -1 || operator === 7) return "sets";
  if (operator === null) return null;
  const raises = (value: number): boolean | null => {
    switch (operator) {
      case 0:
      case 4:
        return value === 1 ? null : value > 1;
      case 1:
      case 5:
        return value === 1 ? null : value < 1;
      case 2:
      case 6:
        return value === 0 ? null : value > 0;
      case 3:
        return value === 0 ? null : value < 0;
      default:
        return null;
    }
  };
  const seen = new Set(
    values.map(raises).filter((x): x is boolean => x !== null),
  );
  if (seen.size === 0) return null;
  if (seen.size === 2) return "increases or decreases";
  const up = [...seen][0] !== (modifiedUnitId === RESONANCE_UNIT_ID);
  return up ? "increases" : "decreases";
}

/** Every link id the input mentions, by link kind. */
export function linkableIds(input: EffectInput): Set<string> {
  const ids = new Set<string>([`/dogma/effect/${input.effectId}`]);
  const attr = (ref: Ref | null) =>
    ref && ids.add(`/dogma/attribute/${ref.id}`);
  Object.values(input.effect.usesAttributes).forEach(attr);
  for (const m of input.modifiers) {
    attr(m.modifiedAttribute);
    attr(m.modifyingAttribute);
    if (m.group) ids.add(`/group/${m.group.id}`);
    if (m.skill) ids.add(`showinfo:${m.skill.id}`);
    for (const skill of m.scalesWithSkills) ids.add(`showinfo:${skill.id}`);
    if (m.stoppedEffect) ids.add(`/dogma/effect/${m.stoppedEffect.id}`);
  }
  return ids;
}

/** Why a description must be redone, or null when it is fine. */
export function checkDescription(
  text: string,
  input: EffectInput,
): string | null {
  return checkLinkedDescription(text, linkableIds(input));
}
