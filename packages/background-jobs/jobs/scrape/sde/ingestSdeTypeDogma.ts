import type { Prisma } from "../../../db";
import type { TypeDogmaRecord } from "./typeDogmaTransforms";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeCompositeTable, loadSdeFile } from "../../../helpers";
import {
  toTypeAttributeRows,
  typePhysicalAttributes,
} from "./typeDogmaTransforms";

export interface IngestSdeTypeDogmaEventPayload {
  data: Record<string, never>;
}

/**
 * typeDogma.yaml maps a type to its dogma attributes and effects, so it feeds
 * two composite-key tables: TypeAttribute (typeId, attributeId → value) and
 * TypeEffect (typeId, effectId → isDefault), both scoped/diffed by `typeId`.
 * TypeAttribute also gets the four attributes EVE reads from the type itself
 * (mass, capacity, volume, radius; see `typePhysicalAttributes`).
 *
 * It is the largest SDE table by row count (~500k–1M TypeAttribute rows across
 * 52k types), so it relies on `ingestSdeCompositeTable`'s scope chunking to keep
 * peak memory bounded. The referenced Type / DogmaAttribute / DogmaEffect rows
 * are assumed to exist.
 */
export const ingestSdeTypeDogma = defineJob<
  IngestSdeTypeDogmaEventPayload["data"]
>({
  id: "ingest-sde-type-dogma",
  name: "Ingest SDE Type Dogma",
  description:
    "Download the SDE and ingest typeDogma.yaml into the TypeAttribute and TypeEffect tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 3600,
  handler: async () => {
    const start = performance.now();

    // Read first and kept as four numbers a type, so the 148 MB parse can be
    // collected before typeDogma.yaml is loaded.
    const physical = typePhysicalAttributes(await loadSdeFile("types.yaml"));

    const data = await loadSdeFile("typeDogma.yaml");
    const entries = Object.entries(data).map(([key, record]) => ({
      typeId: Number(key),
      record: record as TypeDogmaRecord,
    }));
    const typeIds = entries.map((entry) => entry.typeId);

    const attributeRows = entries.flatMap(({ typeId, record }) =>
      toTypeAttributeRows(typeId, record, physical.get(typeId)),
    );

    const effectRows: Prisma.TypeEffectCreateManyInput[] = entries.flatMap(
      ({ typeId, record }) =>
        (record.dogmaEffects ?? []).map((effect) => ({
          typeId,
          effectId: effect.effectID,
          isDefault: effect.isDefault,
          isDeleted: false,
        })),
    );

    // Additive (never soft-delete). Until compatibility date 2026-11-19 these
    // tables were also written from ESI's `/universe/types/{id}`, which listed
    // `charge` (18) and `shieldCharge` (264), always 0, on ships, structures,
    // drones and deployables. That rule does not follow from the SDE — it skips
    // subsystems, which carry the same capacitor and shield attributes — so
    // those rows are left as ESI wrote them rather than guessed at or deleted.
    // The cost: an attribute or effect CCP drops from a type is no longer
    // soft-deleted.
    const typeAttributes = await ingestSdeCompositeTable({
      delegate: prisma.typeAttribute,
      rows: attributeRows,
      keyFields: ["typeId", "attributeId"],
      scopeField: "typeId",
      scopeIds: typeIds,
      softDelete: false,
    });

    const typeEffects = await ingestSdeCompositeTable({
      delegate: prisma.typeEffect,
      rows: effectRows,
      keyFields: ["typeId", "effectId"],
      scopeField: "typeId",
      scopeIds: typeIds,
      softDelete: false,
    });

    return {
      stats: { typeAttributes, typeEffects },
      elapsed: performance.now() - start,
    };
  },
});
