import type { Prisma } from "../../../db";
// Reached directly rather than through `../../../helpers`: the barrel pulls in
// p-limit and the zod-checked env, which Jest cannot load without mocks (see
// ./militaryCampaignTransforms for the same pattern).
import { enString, requiredNumber } from "../../../helpers/sdeFields";

/**
 * Build the MercenaryTacticalOperation row for one SDE record.
 *
 * An operation is keyed by the dungeon it runs in: the record's key IS the
 * dungeons.yaml id. Until SDE build 3693310 (2026-11-13) the record repeated
 * that id as a `dungeonID` field; CCP then removed it as "identical to key".
 * Reading the dropped field produced `NaN`, which Prisma rejects, and because
 * `ingest-sde-all` runs its steps in sequence that one row stopped every step
 * after it. `dungeonId` is therefore taken from the key, which holds the same
 * value on builds from either side of the change.
 */
export function toMercenaryTacticalOperationRow(
  mercenaryTacticalOperationId: number,
  record: Record<string, unknown>,
): Prisma.MercenaryTacticalOperationCreateManyInput {
  return {
    mercenaryTacticalOperationId,
    name: enString(record.name) ?? "",
    description: enString(record.description) ?? "",
    dungeonId: mercenaryTacticalOperationId,
    anarchyImpact: requiredNumber(record.anarchyImpact),
    developmentImpact: requiredNumber(record.developmentImpact),
    infomorphBonus: requiredNumber(record.infomorphBonus),
    isDeleted: false,
  };
}
