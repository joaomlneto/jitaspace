import type { LimitFunction } from "p-limit";
import pLimit from "p-limit";

import {
  getCharactersCharacterId,
  getCorporationsCorporationId,
} from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob, NonRetriableError } from "../../../core";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";

const fetchCorporationWithId = (corporationId: number) =>
  getCorporationsCorporationId(corporationId).then((res) => ({
    corporationId,
    ...res.data,
  }));

const fetchCharacterWithId = (characterId: number) =>
  getCharactersCharacterId(characterId).then((res) => ({
    characterId,
    ...res.data,
  }));

export interface ScrapeCorporationsEventPayload {
  data: {
    corporationIds?: number[];
    batchSize?: number;
  };
}

type StatsKey = "corporations";

const processCorporationBatch = async (
  thisBatchIds: number[],
  limit: LimitFunction,
): Promise<BatchStepResult<StatsKey>> => {
  const stepStartTime = performance.now();

  const thisBatchCorporations = await Promise.all(
    thisBatchIds.map((corporationId) =>
      limit(() => fetchCorporationWithId(corporationId)),
    ),
  );

  const characterIds = thisBatchCorporations
    .flatMap((corporation) => [corporation.ceo_id, corporation.creator_id])
    .filter((characterId) => characterId !== 1);

  await createCorpAndItsRefRecords({
    missingCharacterIds: new Set(characterIds.filter((id) => id > 1)),
    missingCorporationIds: new Set(thisBatchIds.filter((id) => id > 1)),
  });

  const characters = await Promise.all(
    characterIds.map((characterId) =>
      limit(() => fetchCharacterWithId(characterId)),
    ),
  );

  // bootstrap missing corporationIds
  await prisma.corporation.createMany({
    data: thisBatchCorporations.map((corporation) => ({
      corporationId: corporation.corporationId,
      memberCount: corporation.member_count,
      name: corporation.name,
      taxRate: corporation.tax_rate,
      ticker: corporation.ticker,
    })),
    skipDuplicates: true,
  });

  await updateTable({
    fetchLocalEntries: async () =>
      prisma.character
        .findMany({
          where: {
            characterId: {
              in: characterIds,
            },
          },
        })
        .then((entries) =>
          entries.map((entry) =>
            excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
          ),
        ),
    fetchRemoteEntries: () =>
      Promise.resolve(
        characters.map((character) => ({
          characterId: character.characterId,
          birthday: new Date(character.birthday),
          bloodlineId: character.bloodline_id,
          corporationId: character.corporation_id,
          description: character.description ?? null,
          factionId: character.faction_id ?? null,
          gender: character.gender,
          name: character.name,
          raceId: character.race_id,
          securityStatus: character.security_status ?? null,
          title: character.title ?? null,
          isDeleted: false,
        })),
      ),
    batchCreate: (entries) =>
      limit(() =>
        prisma.character.createMany({
          data: entries,
        }),
      ),
    batchDelete: (entries) =>
      prisma.character.updateMany({
        data: {
          isDeleted: true,
        },
        where: {
          characterId: {
            in: entries.map((entry) => entry.characterId),
          },
        },
      }),
    batchUpdate: (entries) =>
      Promise.all(
        entries.map((entry) =>
          limit(async () =>
            prisma.character.update({
              data: entry,
              where: { characterId: entry.characterId },
            }),
          ),
        ),
      ),
    idAccessor: (e) => e.characterId,
  });

  const corporationChanges = await updateTable({
    fetchLocalEntries: async () =>
      prisma.corporation
        .findMany({
          where: {
            corporationId: {
              in: thisBatchIds,
            },
          },
        })
        .then((entries) =>
          entries.map((entry) =>
            excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
          ),
        ),
    fetchRemoteEntries: () =>
      Promise.resolve(
        thisBatchCorporations.map((corporation) => ({
          corporationId: corporation.corporationId,
          allianceId: corporation.alliance_id ?? null,
          ceoId: corporation.ceo_id > 1 ? corporation.ceo_id : null,
          creatorId: corporation.creator_id > 1 ? corporation.creator_id : null,
          dateFounded: corporation.date_founded
            ? new Date(corporation.date_founded)
            : null,
          description: corporation.description ?? null,
          factionId: corporation.faction_id ?? null,
          homeStationId: corporation.home_station_id ?? null,
          memberCount: corporation.member_count,
          name: corporation.name,
          shares: corporation.shares ? BigInt(corporation.shares) : null,
          taxRate: corporation.tax_rate,
          ticker: corporation.ticker,
          url: corporation.url ?? null,
          warEligible: corporation.war_eligible ?? null,
          isDeleted: false,
        })),
      ),
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

  return {
    stats: {
      corporations: corporationChanges,
    },
    elapsed: performance.now() - stepStartTime,
  };
};

export const scrapeEsiCorporations = defineJob<
  ScrapeCorporationsEventPayload["data"]
>({
  id: "scrape-esi-corporations",
  name: "Scrape Corporations",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 1000;
    const corporationIds: number[] = ctx.payload.corporationIds ?? [];

    if (corporationIds.length == 0)
      throw new NonRetriableError("Invalid corporationIds");

    // Split IDs in batches
    corporationIds.sort((a, b) => a - b);

    const numBatches = Math.ceil(corporationIds.length / batchSize);
    const batchIds = (batchIndex: number) =>
      corporationIds.slice(
        batchIndex * batchSize,
        (batchIndex + 1) * batchSize,
      );
    const batches = [...new Array(numBatches).keys()].map((batchId) =>
      batchIds(batchId),
    );

    const results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    for (const [i, batch] of batches.entries()) {
      const result = await ctx.run(`Batch ${i + 1}/${batches.length}`, () =>
        processCorporationBatch(batch, limit),
      );
      results.push(result);
    }

    const totals: BatchStepResult<StatsKey> = {
      stats: {
        corporations: {
          created: 0,
          deleted: 0,
          modified: 0,
          equal: 0,
        },
      },
      elapsed: 0,
    };
    results.forEach((stepResult) => {
      Object.entries(stepResult.stats).forEach(([category, value]) => {
        Object.keys(value).forEach(
          (op) =>
            (totals.stats[category as StatsKey][op as keyof CrudStatistics] +=
              stepResult.stats[category as StatsKey][
                op as keyof CrudStatistics
              ]),
        );
      });
      totals.elapsed += stepResult.elapsed;
    });

    return totals;
  },
});
