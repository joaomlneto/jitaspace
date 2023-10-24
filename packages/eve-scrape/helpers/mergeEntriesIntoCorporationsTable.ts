import pLimit, { LimitFunction } from "p-limit";

import { Corporation, prisma } from "@jitaspace/db";
import { GetCorporationsCorporationIdQueryResponse } from "@jitaspace/esi-client";

import { MAX_DB_PARALLELISM } from "../config";
import { excludeObjectKeys, updateTable } from "../utils";


export const convertEsiCorporationToDomain = (
  corporation: GetCorporationsCorporationIdQueryResponse & {
    corporationId: number;
  },
): Omit<Corporation, "updatedAt"> => ({
  corporationId: corporation.corporationId,
  allianceId: corporation.alliance_id ?? null,
  ceoId: corporation.ceo_id,
  creatorId: corporation.creator_id ?? null,
  dateFounded: corporation.date_founded
    ? new Date(corporation.date_founded)
    : null,
  description: corporation.description ?? null,
  factionId: corporation.faction_id ?? null,
  homeStationId: corporation.home_station_id ?? null,
  memberCount: corporation.member_count,
  name: corporation.name,
  shares: corporation.shares ? BigInt(corporation.shares) : null,
  taxRate: corporation.tax_rate ?? null,
  ticker: corporation.ticker,
  url: corporation.url ?? null,
  warEligible: corporation.war_eligible ?? null,
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
  );

export const mergeEntriesIntoCorporationsTable = (
  corporations: Omit<Corporation, "updatedAt">[],
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
          entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
        ),
    fetchRemoteEntries: async () => corporations,
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
