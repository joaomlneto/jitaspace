import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber,
  plainString,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeDbuffCollectionsEventPayload {
  data: Record<string, never>;
}

interface ModifierBody {
  dogmaAttributeID: number;
  groupID?: number;
  skillID?: number;
}
interface DbuffCollectionRecord {
  itemModifiers?: ModifierBody[];
  locationModifiers?: ModifierBody[];
  locationGroupModifiers?: ModifierBody[];
  locationRequiredSkillModifiers?: ModifierBody[];
}

type Kind = Prisma.DbuffModifierCreateManyInput["kind"];

/**
 * dbuffCollections.yaml defines dynamic buff collections and their four kinds of
 * dogma modifiers. Feeds DbuffCollection (the header) and DbuffModifier (one row
 * per modifier; `groupId`/`skillId` set per kind, `sequence` preserves order).
 */
export const ingestSdeDbuffCollections = defineJob<
  IngestSdeDbuffCollectionsEventPayload["data"]
>({
  id: "ingest-sde-dbuff-collections",
  name: "Ingest SDE Dbuff Collections",
  description:
    "Download the SDE and ingest dbuffCollections.yaml into the DbuffCollection and DbuffModifier tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["dbuffCollections.yaml"]);
    const data = files["dbuffCollections.yaml"];

    const dbuffCollections = await ingestSdeTable({
      filename: "dbuffCollections.yaml",
      idField: "dbuffCollectionId",
      delegate: prisma.dbuffCollection,
      records: data,
      toRow: (record, id): Prisma.DbuffCollectionCreateManyInput => ({
        dbuffCollectionId: id,
        aggregateMode: plainString(record.aggregateMode) ?? "",
        developerDescription: plainString(record.developerDescription) ?? "",
        displayName: enString(record.displayName),
        operationName: plainString(record.operationName) ?? "",
        showOutputValueInUI: plainString(record.showOutputValueInUI) ?? "",
        isDeleted: false,
      }),
    });

    const modifiers: Prisma.DbuffModifierCreateManyInput[] = [];
    const pushModifiers = (
      dbuffCollectionId: number,
      kind: Kind,
      list: ModifierBody[] | undefined,
    ) => {
      (list ?? []).forEach((body, sequence) => {
        modifiers.push({
          dbuffCollectionId,
          kind,
          sequence,
          dogmaAttributeId: requiredNumber(body.dogmaAttributeID),
          groupId: optionalNumber(body.groupID),
          skillId: optionalNumber(body.skillID),
          isDeleted: false,
        });
      });
    };
    for (const [key, value] of Object.entries(data)) {
      const dbuffCollectionId = Number(key);
      const record = value as DbuffCollectionRecord;
      pushModifiers(dbuffCollectionId, "item", record.itemModifiers);
      pushModifiers(dbuffCollectionId, "location", record.locationModifiers);
      pushModifiers(
        dbuffCollectionId,
        "locationGroup",
        record.locationGroupModifiers,
      );
      pushModifiers(
        dbuffCollectionId,
        "locationRequiredSkill",
        record.locationRequiredSkillModifiers,
      );
    }

    const dbuffModifiers = await ingestSdeCompositeTable({
      delegate: prisma.dbuffModifier,
      rows: modifiers,
      keyFields: ["dbuffCollectionId", "kind", "sequence"],
      scopeField: "dbuffCollectionId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { dbuffCollections, dbuffModifiers },
      elapsed: performance.now() - start,
    };
  },
});
