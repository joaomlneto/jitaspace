import pLimit from "p-limit";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { loadSdeFile } from "../../../helpers";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface IngestSdeTypeDogmaEventPayload {
  data: Record<string, never>;
}

interface TypeDogmaRecord {
  dogmaAttributes?: { attributeID: number; value: number }[];
  dogmaEffects?: { effectID: number; isDefault: boolean }[];
}

/**
 * typeDogma.yaml maps a type to its dogma attributes and effects, so it feeds
 * two tables: TypeAttribute (typeId, attributeId → value) and TypeEffect
 * (typeId, effectId → isDefault). Both are composite-key tables, so this job
 * uses `updateTable` directly rather than the single-key `ingestSdeTable`.
 *
 * The referenced Type / DogmaAttribute / DogmaEffect rows are assumed to exist.
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
    const limit = pLimit(20);

    const data = await loadSdeFile("typeDogma.yaml");
    const entries = Object.entries(data).map(([key, record]) => ({
      typeId: Number(key),
      record: record as TypeDogmaRecord,
    }));
    const typeIds = entries.map((entry) => entry.typeId);

    const attributeRows = entries.flatMap(({ typeId, record }) =>
      (record.dogmaAttributes ?? []).map((attribute) => ({
        typeId,
        attributeId: attribute.attributeID,
        value: attribute.value,
        isDeleted: false,
      })),
    );

    const effectRows = entries.flatMap(({ typeId, record }) =>
      (record.dogmaEffects ?? []).map((effect) => ({
        typeId,
        effectId: effect.effectID,
        isDefault: effect.isDefault,
        isDeleted: false,
      })),
    );

    const typeAttributes = await updateTable({
      idAccessor: (row) => `${row.typeId}:${row.attributeId}`,
      fetchLocalEntries: async () =>
        prisma.typeAttribute
          .findMany({ where: { typeId: { in: typeIds } } })
          .then((rows) =>
            rows.map((row) =>
              excludeObjectKeys(row, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () => Promise.resolve(attributeRows),
      batchCreate: (rows) =>
        limit(() => prisma.typeAttribute.createMany({ data: rows })),
      batchUpdate: (rows) =>
        Promise.all(
          rows.map((row) =>
            limit(() =>
              prisma.typeAttribute.update({
                data: row,
                where: {
                  typeId_attributeId: {
                    typeId: row.typeId,
                    attributeId: row.attributeId,
                  },
                },
              }),
            ),
          ),
        ),
      batchDelete: (rows) =>
        prisma.typeAttribute.updateMany({
          data: { isDeleted: true },
          where: {
            OR: rows.map((row) => ({
              typeId: row.typeId,
              attributeId: row.attributeId,
            })),
          },
        }),
    });

    const typeEffects = await updateTable({
      idAccessor: (row) => `${row.typeId}:${row.effectId}`,
      fetchLocalEntries: async () =>
        prisma.typeEffect
          .findMany({ where: { typeId: { in: typeIds } } })
          .then((rows) =>
            rows.map((row) =>
              excludeObjectKeys(row, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () => Promise.resolve(effectRows),
      batchCreate: (rows) =>
        limit(() => prisma.typeEffect.createMany({ data: rows })),
      batchUpdate: (rows) =>
        Promise.all(
          rows.map((row) =>
            limit(() =>
              prisma.typeEffect.update({
                data: row,
                where: {
                  typeId_effectId: {
                    typeId: row.typeId,
                    effectId: row.effectId,
                  },
                },
              }),
            ),
          ),
        ),
      batchDelete: (rows) =>
        prisma.typeEffect.updateMany({
          data: { isDeleted: true },
          where: {
            OR: rows.map((row) => ({
              typeId: row.typeId,
              effectId: row.effectId,
            })),
          },
        }),
    });

    return {
      stats: { typeAttributes, typeEffects },
      elapsed: performance.now() - start,
    };
  },
});
