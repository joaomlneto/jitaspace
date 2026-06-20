import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  plainString,
} from "../../../helpers";

export interface IngestSdeTypeListsEventPayload {
  data: Record<string, never>;
}

/**
 * The six include/exclude arrays in typeLists.yaml, mapped onto the polymorphic
 * TypeListEntry table (`included` + `refType` discriminators).
 */
const ENTRY_RULES: {
  field: string;
  included: boolean;
  refType: Prisma.TypeListEntryCreateManyInput["refType"];
}[] = [
  { field: "includedTypeIDs", included: true, refType: "type" },
  { field: "includedGroupIDs", included: true, refType: "group" },
  { field: "includedCategoryIDs", included: true, refType: "category" },
  { field: "excludedTypeIDs", included: false, refType: "type" },
  { field: "excludedGroupIDs", included: false, refType: "group" },
  { field: "excludedCategoryIDs", included: false, refType: "category" },
];

/**
 * typeLists.yaml feeds TypeList (the named list) and TypeListEntry (its
 * include/exclude membership rules). `refId` is polymorphic (type/group/category
 * per `refType`) so it has no foreign key and is stored as-is.
 */
export const ingestSdeTypeLists = defineJob<
  IngestSdeTypeListsEventPayload["data"]
>({
  id: "ingest-sde-type-lists",
  name: "Ingest SDE Type Lists",
  description:
    "Download the SDE and ingest typeLists.yaml into the TypeList and TypeListEntry tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["typeLists.yaml"]);
    const data = files["typeLists.yaml"];

    const typeLists = await ingestSdeTable({
      filename: "typeLists.yaml",
      idField: "typeListId",
      delegate: prisma.typeList,
      records: data,
      toRow: (record, id): Prisma.TypeListCreateManyInput => ({
        typeListId: id,
        name: plainString(record.name) ?? "",
        displayName: enString(record.displayName),
        displayDescription: enString(record.displayDescription),
        isDeleted: false,
      }),
    });

    const entries: Prisma.TypeListEntryCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const typeListId = Number(key);
      const record = value as Record<string, unknown>;
      for (const { field, included, refType } of ENTRY_RULES) {
        const ids = record[field];
        if (!Array.isArray(ids)) continue;
        for (const refId of ids as number[]) {
          entries.push({
            typeListId,
            included,
            refType,
            refId,
            isDeleted: false,
          });
        }
      }
    }

    const scopeIds = Object.keys(data).map(Number);

    const typeListEntries = await ingestSdeCompositeTable({
      delegate: prisma.typeListEntry,
      rows: entries,
      keyFields: ["typeListId", "included", "refType", "refId"],
      scopeField: "typeListId",
      scopeIds,
    });

    return {
      stats: { typeLists, typeListEntries },
      elapsed: performance.now() - start,
    };
  },
});
