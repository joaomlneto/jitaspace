import type { Prisma } from "../../../db";
// Imported from the module rather than the `helpers` barrel: sdeFields has no
// runtime dependencies of its own, so this module stays unit-testable without
// mocking p-limit or the zod-checked env (see ./missionTransforms).
import { optionalNumber } from "../../../helpers/sdeFields";

export interface TypeDogmaRecord {
  dogmaAttributes?: { attributeID: number; value: number }[];
  dogmaEffects?: { effectID: number; isDefault: boolean }[];
}

/** Dogma attribute ids EVE reads from a type's own fields. */
export const MASS_ATTRIBUTE_ID = 4;
export const CAPACITY_ATTRIBUTE_ID = 38;
export const VOLUME_ATTRIBUTE_ID = 161;
export const RADIUS_ATTRIBUTE_ID = 162;

/**
 * The dogma attributes EVE takes from a type's own fields rather than from
 * typeDogma.yaml: mass (4), capacity (38), volume (161) and radius (162). ESI
 * listed them among every dogma type's attributes, with 0 for a missing mass,
 * capacity or volume and 1 for a missing radius — 129 of 129 types sampled on
 * 2026-11-24 matched this rule. Keyed by type id, from types.yaml.
 */
export function typePhysicalAttributes(
  types: Record<string, unknown>,
): Map<number, Map<number, number>> {
  const attributes = new Map<number, Map<number, number>>();
  for (const [key, value] of Object.entries(types)) {
    const type = value as Record<string, unknown>;
    attributes.set(
      Number(key),
      new Map([
        [MASS_ATTRIBUTE_ID, optionalNumber(type.mass) ?? 0],
        [CAPACITY_ATTRIBUTE_ID, optionalNumber(type.capacity) ?? 0],
        [VOLUME_ATTRIBUTE_ID, optionalNumber(type.volume) ?? 0],
        [RADIUS_ATTRIBUTE_ID, optionalNumber(type.radius) ?? 1],
      ]),
    );
  }
  return attributes;
}

/**
 * One type's TypeAttribute rows: what typeDogma.yaml lists, plus the physical
 * attributes from {@link typePhysicalAttributes} that it does not. Only a type
 * with a typeDogma entry gets them, as on ESI, so this is only called for those.
 * Where both have a value, typeDogma.yaml's wins.
 */
export function toTypeAttributeRows(
  typeId: number,
  record: TypeDogmaRecord,
  physical: ReadonlyMap<number, number> | undefined,
): Prisma.TypeAttributeCreateManyInput[] {
  const rows: Prisma.TypeAttributeCreateManyInput[] = (
    record.dogmaAttributes ?? []
  ).map((attribute) => ({
    typeId,
    attributeId: attribute.attributeID,
    value: attribute.value,
    isDeleted: false,
  }));
  const listed = new Set(rows.map((row) => row.attributeId));
  for (const [attributeId, value] of physical ?? []) {
    if (listed.has(attributeId)) continue;
    rows.push({ typeId, attributeId, value, isDeleted: false });
  }
  return rows;
}
