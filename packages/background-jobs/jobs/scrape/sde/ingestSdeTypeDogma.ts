import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeCompositeTable, loadSdeFile } from "../../../helpers";

export interface IngestSdeTypeDogmaEventPayload {
  data: Record<string, never>;
}

interface TypeDogmaRecord {
  dogmaAttributes?: { attributeID: number; value: number }[];
  dogmaEffects?: { effectID: number; isDefault: boolean }[];
}

/**
 * typeDogma.yaml maps a type to its dogma attributes and effects, so it feeds
 * two composite-key tables: TypeAttribute (typeId, attributeId → value) and
 * TypeEffect (typeId, effectId → isDefault), both scoped/diffed by `typeId`.
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

    const data = await loadSdeFile("typeDogma.yaml");
    const entries = Object.entries(data).map(([key, record]) => ({
      typeId: Number(key),
      record: record as TypeDogmaRecord,
    }));
    const typeIds = entries.map((entry) => entry.typeId);

    const attributeRows: Prisma.TypeAttributeCreateManyInput[] =
      entries.flatMap(({ typeId, record }) =>
        (record.dogmaAttributes ?? []).map((attribute) => ({
          typeId,
          attributeId: attribute.attributeID,
          value: attribute.value,
          isDeleted: false,
        })),
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

    // TypeAttribute / TypeEffect are also written by the ESI `scrapeEsiTypes`
    // scraper (from `/universe/types/{id}` dogma), which currently reports more
    // attributes than the SDE typeDogma.yaml lists. Run additively (never
    // soft-delete) so this SDE ingest only fills/refreshes rows and never
    // removes the ESI scraper's — the two writers coexist instead of fighting.
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
