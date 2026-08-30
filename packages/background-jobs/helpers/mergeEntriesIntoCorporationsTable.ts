import type { LimitFunction } from "p-limit";
import pLimit from "p-limit";

import type { GetCorporationsCorporationIdQueryResponse } from "@jitaspace/esi-client";

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

export const convertEsiCorporationToDomain = (
  corporation: GetCorporationsCorporationIdQueryResponse & {
    corporationId: number;
  },
): EsiCorporationRow => ({
  corporationId: corporation.corporationId,
  allianceId: corporation.alliance_id ?? null,
  ceoId: corporation.ceo_id ?? null,
  creatorId: corporation.creator_id ?? null,
  dateFounded: corporation.date_founded
    ? new Date(corporation.date_founded)
    : null,
  description: corporation.description,
  factionId: corporation.enlisted_faction_id ?? null,
  homeStationId: corporation.home_station_id,
  memberCount: corporation.member_count,
  name: corporation.name,
  shares: corporation.shares ? BigInt(corporation.shares) : null,
  taxRate: esiTaxRateToFraction(corporation.tax_rates.isk),
  ticker: corporation.ticker,
  url: corporation.url ?? null,
  warEligible: corporation.war_eligible,
  isDeleted: false,
});

export const mergeEsiEntriesIntoCorporationsTable = (
  corporations: (GetCorporationsCorporationIdQueryResponse & {
    corporationId: number;
  })[],
  limit?: LimitFunction,
) =>
  mergeEntriesIntoCorporationsTable(
    corporations.map(convertEsiCorporationToDomain),
    limit,
  );

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
