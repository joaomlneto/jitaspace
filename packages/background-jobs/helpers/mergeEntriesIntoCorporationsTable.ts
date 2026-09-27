import pLimit from "p-limit";

import type { Corporation } from "../db";
import { MAX_DB_PARALLELISM } from "../config";
import { prisma } from "../db";
import { excludeObjectKeys, updateTable } from "../utils";
import { SDE_OWNED_CORPORATION_COLUMNS } from "./sdeOwnedColumns";

/**
 * A Corporation row as ESI knows it — no timestamps, and none of the SDE-owned
 * columns, which `ingestSdeNpcCorporations` writes and ESI cannot supply.
 */
export type EsiCorporationRow = Omit<
  Corporation,
  "updatedAt" | "createdAt" | (typeof SDE_OWNED_CORPORATION_COLUMNS)[number]
>;

/**
 * Rescales an ESI corporation tax rate into the fraction this codebase stores.
 *
 * Since ESI compatibility date 2026-08-18 the corporation endpoint reports tax
 * rates as percentages (`10.0` means 10%); before that it sent a 0-1 fraction
 * under the old `tax_rate` field. `Corporation.taxRate` and every reader of it
 * are still fractions, so the conversion happens here at the ESI boundary
 * rather than by migrating the column and every consumer.
 */
export const esiTaxRateToFraction = (taxRate: number) => taxRate / 100;

export const mergeEntriesIntoCorporationsTable = (
  corporations: EsiCorporationRow[],
  limit = pLimit(MAX_DB_PARALLELISM),
) =>
  updateTable({
    fetchLocalEntries: async () =>
      prisma.corporation
        .findMany({
          where: {
            corporationId: {
              in: corporations.map((corporation) => corporation.corporationId),
            },
          },
        })
        .then((entries) =>
          entries.map((entry) =>
            excludeObjectKeys(entry, [
              "updatedAt",
              "createdAt",
              ...SDE_OWNED_CORPORATION_COLUMNS,
            ]),
          ),
        ),
    fetchRemoteEntries: () => Promise.resolve(corporations),
    batchCreate: (entries) =>
      limit(() =>
        prisma.corporation.createMany({
          data: entries,
        }),
      ),
    batchDelete: (entries) =>
      prisma.corporation.updateMany({
        data: {
          isDeleted: true,
        },
        where: {
          corporationId: {
            in: entries.map((entry) => entry.corporationId),
          },
        },
      }),
    batchUpdate: (entries) =>
      Promise.all(
        entries.map((entry) =>
          limit(async () =>
            prisma.corporation.update({
              data: entry,
              where: { corporationId: entry.corporationId },
            }),
          ),
        ),
      ),
    idAccessor: (e) => e.corporationId,
  });
