/**
 * The rules behind DogmaAttribute.customDescription, shared by
 * scripts/describe-dogma-attributes.ts and its tests: the prompt Claude writes
 * from, the input it gets, and what a finished description may link.
 */
import type { Ref } from "./dogmaEffectDescriptions";
import { checkLinkedDescription } from "./linkedDescriptions";

export const ATTRIBUTE_SYSTEM_PROMPT = `You write short descriptions of EVE Online dogma attributes for JitaSpace, a reference website. An attribute is a named number an item carries (a ship's maximum velocity, a module's activation cost, the bonus a skill or implant gives) that dogma effects read and change. Players read your text at the top of the attribute's page, which also shows CCP's own tooltip and note, the effects that change or read the attribute, and every item that has it with its value.

Write one or two sentences, about 150 and never more than 240 visible characters. Say what the attribute represents in game terms, what it affects, and what changes it.

Format: plain text with links, and no other markup. Link the first mention of each skill, group, attribute and effect you name, using its id from the input and exactly one of these forms:
- a skill or item type: <a href="showinfo:TYPEID">Name</a>
- a group: <a href="/group/GROUPID">Name</a>
- a dogma attribute: <a href="/dogma/attribute/ATTRIBUTEID">Name</a>
- a dogma effect: <a href="/dogma/effect/EFFECTID">Name</a>
Only link ids that appear in the input, and never link the attribute you are describing. Never write other tags, entities or markdown.

Rules:
- Use only the data provided. CCP's tooltip and note are hints: use what they mean, do not copy them, and ignore notes that are only developer shorthand. Do not add game mechanics that are not in the data (stacking penalties, overheating, how a module is activated).
- No numbers: no values, ranges, percentages, multipliers or counts. The page shows each item's value.
- Never name the items that have the attribute, and do not list their groups. You may say what kind of object carries it (a ship, module, charge, drone, skill, implant, structure, character or NPC), using itemKinds.
- When scaledBySkills lists skills, the item's value is multiplied by the pilot's trained level in that skill: say it applies per <a href="showinfo:TYPEID">Skill Name</a> level.
- Do not say whether a higher value is better or whether it is stacking penalised: the page shows both.
- Name attributes by their display name. Use an internal camelCase name only when it is the only name there is.
- Do not begin with "This attribute", and do not repeat its internal name.
- When nothing changes or reads the attribute, describe only what it represents; never state that nothing changes or reads it.
- A modifier's skill is the skill its target items require (microwarpdrives require High Speed Maneuvering), not what makes the change: say "modules that require High Speed Maneuvering", never "changed by High Speed Maneuvering". What makes the change is the modifier's effect and modifying attribute.

How to read changedBy and changes (modifiers of dogma effects):
- domain says where the targets are. shipID: the hull the item is fitted to. structureID: the structure. charID: the pilot. itemID: the item that has the effect itself. otherID: the charge loaded in a module, or the module a charge is loaded in. targetID and target: whatever the item is activated on.
- func says which items. ItemModifier: the domain itself. LocationModifier: everything fitted to or located in the domain. LocationGroupModifier: items of the given group in the domain. LocationRequiredSkillModifier: items in the domain that require the given skill. OwnerRequiredSkillModifier: items owned by the pilot that require the given skill, including drones and missiles in space.
- operation: PreAssign and PostAssign set the value; PreMul and PostMul multiply; PreDiv and PostDiv divide; ModAdd adds; ModSub subtracts; PostPercent changes by a percentage.

Reply with the description only.`;

export interface AttributeModifierInput {
  effect: Ref;
  func: string;
  domain: string | null;
  operation: string | null;
  group: Ref | null;
  skill: Ref | null;
}

export interface AttributeInput {
  attributeId: number;
  attribute: {
    internalName: string | null;
    displayName: string | null;
    unit: string | null;
    category: string | null;
    ccpTooltip: string | null;
    ccpNote: string | null;
    minimumFrom: Ref | null;
    maximumFrom: Ref | null;
    rechargeTimeFrom: Ref | null;
  };
  /** What kind of objects carry it: category name → how many items. */
  itemKinds: { kind: string; items: number }[];
  scaledBySkills: Ref[];
  /** Modifiers that change this attribute, and with which attribute. */
  changedBy: (AttributeModifierInput & { modifyingAttribute: Ref | null })[];
  changedByTotal: number;
  /** Modifiers that read this attribute to change another. */
  changes: (AttributeModifierInput & { modifiedAttribute: Ref | null })[];
  changesTotal: number;
  /** Effects that point at this attribute as one of their stats. */
  usedAsStatBy: { effect: Ref; role: string }[];
}

/** Every href the input lets a description link; never the attribute itself. */
export function attributeLinkableIds(input: AttributeInput): Set<string> {
  const ids = new Set<string>();
  const attr = (ref: Ref | null) => {
    if (ref && ref.id !== input.attributeId) {
      ids.add(`/dogma/attribute/${ref.id}`);
    }
  };
  const common = (m: AttributeModifierInput) => {
    ids.add(`/dogma/effect/${m.effect.id}`);
    if (m.group) ids.add(`/group/${m.group.id}`);
    if (m.skill) ids.add(`showinfo:${m.skill.id}`);
  };
  attr(input.attribute.minimumFrom);
  attr(input.attribute.maximumFrom);
  attr(input.attribute.rechargeTimeFrom);
  for (const skill of input.scaledBySkills) ids.add(`showinfo:${skill.id}`);
  for (const m of input.changedBy) {
    common(m);
    attr(m.modifyingAttribute);
  }
  for (const m of input.changes) {
    common(m);
    attr(m.modifiedAttribute);
  }
  for (const s of input.usedAsStatBy) ids.add(`/dogma/effect/${s.effect.id}`);
  return ids;
}

/** Why a description must be redone, or null when it is fine. */
export function checkAttributeDescription(
  text: string,
  input: AttributeInput,
): string | null {
  return checkLinkedDescription(text, attributeLinkableIds(input));
}
