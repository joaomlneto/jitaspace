/**
 * Plain-language reading of dogma effect modifiers (SDE `modifierInfo`).
 *
 * A modifier changes one attribute (`modifiedAttributeId`) of whatever its
 * `func` and `domain` select, by the value of another attribute
 * (`modifyingAttributeId`) of the item carrying the effect, combined with the
 * operator. EffectStoppers carry no attributes: they stop `targetEffectId` on
 * the domain instead.
 */

export interface DogmaModifier {
  modifierIndex: number;
  func: string;
  domain: string | null;
  operator: number | null;
  modifiedAttributeId: number | null;
  modifyingAttributeId: number | null;
  groupId: number | null;
  skillTypeId: number | null;
  targetEffectId: number | null;
}

export interface DogmaOperatorInfo {
  /** The dogma name of the operation, e.g. `PostPercent`. */
  name: string;
  /** What it does, in a few words. */
  label: string;
  /** The symbol written between the modified and modifying attribute. */
  symbol: string;
  /** Written after the modifying attribute (`%` for PostPercent). */
  suffix?: string;
}

/**
 * The operations in the order dogma applies them. 1 (PreDiv) never appears
 * in the SDE today but is part of the same scheme. 9 appears once, in
 * `skillEffect`, and is undocumented, so it is deliberately not named here.
 */
export const DOGMA_OPERATORS: Record<number, DogmaOperatorInfo> = {
  [-1]: { name: "PreAssign", label: "pre-assign", symbol: "set to" },
  0: { name: "PreMul", label: "pre-multiply", symbol: "×" },
  1: { name: "PreDiv", label: "pre-divide", symbol: "÷" },
  2: { name: "ModAdd", label: "add", symbol: "+" },
  3: { name: "ModSub", label: "subtract", symbol: "−" },
  4: { name: "PostMul", label: "post-multiply", symbol: "×" },
  5: { name: "PostDiv", label: "post-divide", symbol: "÷" },
  6: { name: "PostPercent", label: "percent", symbol: "+", suffix: "%" },
  7: { name: "PostAssign", label: "post-assign", symbol: "=" },
};

export function dogmaOperatorInfo(
  operator: number | null,
): DogmaOperatorInfo | null {
  if (operator === null) return null;
  return DOGMA_OPERATORS[operator] ?? null;
}

/** What each domain refers to, as a noun ("the ship"). */
export const DOGMA_DOMAINS: Record<string, string> = {
  shipID: "ship",
  charID: "character",
  itemID: "item itself",
  otherID: "paired item",
  structureID: "structure",
  targetID: "target",
  target: "target",
};

/** Longer explanations for the domains whose noun alone is ambiguous. */
export const DOGMA_DOMAIN_HINTS: Record<string, string> = {
  itemID: "The item that carries this effect.",
  otherID:
    "The charge loaded in this module, or the module this charge is loaded in.",
};

export function dogmaDomainNoun(domain: string | null): string {
  if (domain === null) return "unknown domain";
  return DOGMA_DOMAINS[domain] ?? domain;
}

/**
 * Modifiers that read as one sentence: the same function, domain, operator,
 * modifying attribute and skill, differing only in which groups, modified
 * attributes or stopped effects they cover. `modifiers` keeps every source
 * row, verbatim, in SDE order.
 */
export interface DogmaModifierLine {
  key: string;
  func: string;
  domain: string | null;
  operator: number | null;
  modifyingAttributeId: number | null;
  skillTypeId: number | null;
  groupIds: number[];
  modifiedAttributeIds: number[];
  targetEffectIds: number[];
  modifiers: DogmaModifier[];
}

const pushUnique = (list: number[], value: number | null) => {
  if (value !== null && !list.includes(value)) list.push(value);
};

const listKey = (list: number[]) => list.join(",");

function mergeBy(
  lines: DogmaModifierLine[],
  keyOf: (line: DogmaModifierLine) => string,
  merge: (into: DogmaModifierLine, from: DogmaModifierLine) => void,
): DogmaModifierLine[] {
  const merged = new Map<string, DogmaModifierLine>();
  for (const line of lines) {
    const key = keyOf(line);
    const existing = merged.get(key);
    if (existing) {
      merge(existing, line);
      existing.modifiers.push(...line.modifiers);
    } else {
      merged.set(key, { ...line, modifiers: [...line.modifiers] });
    }
  }
  return [...merged.values()];
}

const baseKey = (line: DogmaModifierLine) =>
  [
    line.func,
    line.domain,
    line.operator,
    line.modifyingAttributeId,
    line.skillTypeId,
  ].join("|");

/**
 * Collapse modifiers into sentences, in three passes: first the same change
 * applied to several groups, then several attributes changed the same way,
 * then several effects stopped together. Lines keep the position of their
 * first modifier.
 */
export function groupDogmaModifiers(
  modifiers: readonly DogmaModifier[],
): DogmaModifierLine[] {
  const sorted = [...modifiers].sort(
    (a, b) => a.modifierIndex - b.modifierIndex,
  );
  let lines: DogmaModifierLine[] = sorted.map((modifier) => ({
    key: String(modifier.modifierIndex),
    func: modifier.func,
    domain: modifier.domain,
    operator: modifier.operator,
    modifyingAttributeId: modifier.modifyingAttributeId,
    skillTypeId: modifier.skillTypeId,
    groupIds: modifier.groupId === null ? [] : [modifier.groupId],
    modifiedAttributeIds:
      modifier.modifiedAttributeId === null
        ? []
        : [modifier.modifiedAttributeId],
    targetEffectIds:
      modifier.targetEffectId === null ? [] : [modifier.targetEffectId],
    modifiers: [modifier],
  }));

  lines = mergeBy(
    lines,
    (line) =>
      [
        baseKey(line),
        listKey(line.modifiedAttributeIds),
        listKey(line.targetEffectIds),
      ].join("/"),
    (into, from) =>
      from.groupIds.forEach((id) => pushUnique(into.groupIds, id)),
  );
  lines = mergeBy(
    lines,
    (line) =>
      [
        baseKey(line),
        listKey(line.groupIds),
        listKey(line.targetEffectIds),
      ].join("/"),
    (into, from) =>
      from.modifiedAttributeIds.forEach((id) =>
        pushUnique(into.modifiedAttributeIds, id),
      ),
  );
  lines = mergeBy(
    lines,
    (line) =>
      [
        baseKey(line),
        listKey(line.groupIds),
        listKey(line.modifiedAttributeIds),
      ].join("/"),
    (into, from) =>
      from.targetEffectIds.forEach((id) =>
        pushUnique(into.targetEffectIds, id),
      ),
  );

  return lines.map((line) => ({
    ...line,
    key: line.modifiers.map((modifier) => modifier.modifierIndex).join("-"),
  }));
}
