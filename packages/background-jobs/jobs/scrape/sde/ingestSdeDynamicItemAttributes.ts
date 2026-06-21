import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeDynamicItemAttributesEventPayload {
  data: Record<string, never>;
}

interface DynamicItemAttributesRecord {
  attributeIDs?: Record<string, { min: number; max: number }>;
  inputOutputMapping?: { applicableTypes?: number[]; resultingType: number }[];
}

/**
 * dynamicItemAttributes.yaml describes mutaplasmids: the attribute min/max
 * ranges they roll (`attributeIDs`) and which base types they apply to / produce
 * (`inputOutputMapping`). Feeds DynamicItemAttribute (the entity), and the
 * Range and Mapping child tables.
 */
export const ingestSdeDynamicItemAttributes = defineJob<
  IngestSdeDynamicItemAttributesEventPayload["data"]
>({
  id: "ingest-sde-dynamic-item-attributes",
  name: "Ingest SDE Dynamic Item Attributes",
  description:
    "Download the SDE and ingest dynamicItemAttributes.yaml into the DynamicItemAttribute, DynamicItemAttributeRange and DynamicItemAttributeMapping tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["dynamicItemAttributes.yaml"]);
    const data = files["dynamicItemAttributes.yaml"];

    const dynamicItemAttributes = await ingestSdeTable({
      filename: "dynamicItemAttributes.yaml",
      idField: "mutaplasmidTypeId",
      delegate: prisma.dynamicItemAttribute,
      records: data,
      toRow: (_record, id): Prisma.DynamicItemAttributeCreateManyInput => ({
        mutaplasmidTypeId: id,
        isDeleted: false,
      }),
    });

    const ranges: Prisma.DynamicItemAttributeRangeCreateManyInput[] = [];
    const mappings: Prisma.DynamicItemAttributeMappingCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const mutaplasmidTypeId = Number(key);
      const record = value as DynamicItemAttributesRecord;
      for (const [attrKey, range] of Object.entries(
        record.attributeIDs ?? {},
      )) {
        ranges.push({
          mutaplasmidTypeId,
          attributeId: Number(attrKey),
          min: requiredNumber(range.min),
          max: requiredNumber(range.max),
          isDeleted: false,
        });
      }
      for (const mapping of record.inputOutputMapping ?? []) {
        for (const applicableTypeId of mapping.applicableTypes ?? []) {
          mappings.push({
            mutaplasmidTypeId,
            resultingTypeId: requiredNumber(mapping.resultingType),
            applicableTypeId,
            isDeleted: false,
          });
        }
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const dynamicItemAttributeRanges = await ingestSdeCompositeTable({
      delegate: prisma.dynamicItemAttributeRange,
      rows: ranges,
      keyFields: ["mutaplasmidTypeId", "attributeId"],
      scopeField: "mutaplasmidTypeId",
      scopeIds,
    });
    const dynamicItemAttributeMappings = await ingestSdeCompositeTable({
      delegate: prisma.dynamicItemAttributeMapping,
      rows: mappings,
      keyFields: ["mutaplasmidTypeId", "resultingTypeId", "applicableTypeId"],
      scopeField: "mutaplasmidTypeId",
      scopeIds,
    });

    return {
      stats: {
        dynamicItemAttributes,
        dynamicItemAttributeRanges,
        dynamicItemAttributeMappings,
      },
      elapsed: performance.now() - start,
    };
  },
});
