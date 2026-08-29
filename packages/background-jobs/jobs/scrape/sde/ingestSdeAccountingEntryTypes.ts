import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, plainString } from "../../../helpers";

export interface IngestSdeAccountingEntryTypesEventPayload {
  data: Record<string, never>;
}

/**
 * accountingEntryTypes.yaml — the wallet-journal reference types. `internalName`
 * is the plain string ESI returns as `ref_type`; the localized `name` is the
 * label the client shows for it.
 */
export const ingestSdeAccountingEntryTypes = defineJob<
  IngestSdeAccountingEntryTypesEventPayload["data"]
>({
  id: "ingest-sde-accounting-entry-types",
  name: "Ingest SDE Accounting Entry Types",
  description:
    "Download the SDE and ingest accountingEntryTypes.yaml into the AccountingEntryType table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const accountingEntryTypes = await ingestSdeTable({
      filename: "accountingEntryTypes.yaml",
      idField: "accountingEntryTypeId",
      delegate: prisma.accountingEntryType,
      toRow: (record, id): Prisma.AccountingEntryTypeCreateManyInput => ({
        accountingEntryTypeId: id,
        internalName: plainString(record.internalName) ?? "",
        name: enString(record.name) ?? "",
        journalMessage: enString(record.journalMessage),
        description: enString(record.description),
        isDeleted: false,
      }),
    });
    return {
      stats: { accountingEntryTypes },
      elapsed: performance.now() - start,
    };
  },
});
