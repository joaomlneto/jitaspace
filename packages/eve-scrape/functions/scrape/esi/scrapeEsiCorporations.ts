import { NonRetriableError } from "inngest";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getCharactersCharacterId,
  getCorporationsCorporationId,
} from "@jitaspace/esi-client";

import { client } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeCorporationsEventPayload = {
  data: {
    corporationIds: number[];
    batchSize?: number;
  };
};

type StatsKey = "corporations";

export const scrapeEsiCorporations = client.createFunction(
  {
    id: "scrape-esi-corporations",
    name: "Scrape Corporations",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/corporations" },
  async ({ step, event }) => {
    const batchSize = event.data.batchSize ?? 1000;
    const corporationIds: number[] = event.data.corporationIds;

    if ((event.data.corporationIds ?? []).length == 0)
      throw new NonRetriableError("Invalid corporationIds");

    // Split IDs in batches
    corporationIds.sort((a, b) => a - b);

    const numBatches = Math.ceil(corporationIds.length / batchSize);
    const batchIds = (batchIndex: number) =>
      corporationIds.slice(
        batchIndex * batchSize,
        (batchIndex + 1) * batchSize,
      );
    const batches = [...Array(numBatches).keys()].map((batchId) =>
      batchIds(batchId),
    );

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();
          const thisBatchIds = batches[i]!;

          const thisBatchCorporations = await Promise.all(
            thisBatchIds.map((corporationId) =>
              limit(async () =>
                getCorporationsCorporationId(corporationId).then((res) => ({
                  corporationId,
                  ...res.data,
                })),
              ),
            ),
          );

          const characterIds = thisBatchCorporations
            .flatMap((corporation) => [
              corporation.ceo_id,
              corporation.creator_id,
            ])
            .filter((characterId) => characterId !== 1);

          const characters = await Promise.all(
            characterIds.map((characterId) =>
              limit(async () =>
                getCharactersCharacterId(characterId).then((res) => ({
                  characterId,
                  ...res.data,
                })),
              ),
            ),
          );

          // bootstrap missing corporationIds
          const corporationIdsInDb = await prisma.corporation.createMany({
            data: thisBatchCorporations.map((corporation) => ({
              corporationId: corporation.corporationId,
              memberCount: corporation.member_count,
              name: corporation.name,
              taxRate: corporation.tax_rate,
              ticker: corporation.ticker,
            })),
            skipDuplicates: true,
          });

          const characterChanges = await updateTable({
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
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
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
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              thisBatchCorporations.map((corporation) => ({
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
              })),
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
              corporations: {
                created: corporationChanges.created,
                deleted: corporationChanges.deleted,
                modified: corporationChanges.modified,
                equal: corporationChanges.equal,
              },
            },
            elapsed: performance.now() - stepStartTime,
          };
        },
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
);
