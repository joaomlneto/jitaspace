/**
 * Pure transforms for the ship-tree files. No imports at all, so this module is
 * unit-testable without mocking p-limit or the env.
 *
 * shipTreeFactions.yaml, shipTreeGroups.yaml and typeElements.yaml all carry the
 * same `elements` shape: an ordered `slot -> shipTreeElementID` map. The slot key
 * is preserved so ordering survives.
 */

/** One `elements` entry: the slot it occupies and the element shown there. */
export interface ElementEntry {
  slot: number;
  shipTreeElementId: number;
}

/**
 * Walk an `elements` map into ordered entries, dropping any element id absent
 * from `knownElementIds` when that guard is supplied — the same treatment
 * ingestSdeTypes gives its optional `graphicID`.
 */
export function elementEntries(
  elements: Record<string, unknown> | undefined,
  knownElementIds?: ReadonlySet<number>,
): ElementEntry[] {
  const entries: ElementEntry[] = [];
  for (const [slot, elementId] of Object.entries(elements ?? {})) {
    const shipTreeElementId = Number(elementId);
    if (knownElementIds && !knownElementIds.has(shipTreeElementId)) continue;
    entries.push({ slot: Number(slot), shipTreeElementId });
  }
  return entries;
}

/** One flattened `preReqSkills.<factionID>.skills.<typeID>` entry. */
export interface PreReqSkillEntry {
  factionId: number;
  skillTypeId: number;
  level: number | null;
  display: boolean | null;
}

/** Flatten the two-level `preReqSkills` tree into entries. */
export function preReqSkillEntries(
  preReqSkills:
    | Record<
        string,
        { skills?: Record<string, { level?: number; display?: boolean }> }
      >
    | undefined,
): PreReqSkillEntry[] {
  const entries: PreReqSkillEntry[] = [];
  for (const [factionKey, faction] of Object.entries(preReqSkills ?? {})) {
    for (const [skillKey, skill] of Object.entries(faction.skills ?? {})) {
      entries.push({
        factionId: Number(factionKey),
        skillTypeId: Number(skillKey),
        level: skill.level == null ? null : Number(skill.level),
        display: skill.display == null ? null : Boolean(skill.display),
      });
    }
  }
  return entries;
}
