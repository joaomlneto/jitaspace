import axios from "axios";
import { NonRetriableError } from "inngest";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getCorporationsCorporationId } from "@jitaspace/esi-client-kubb";

import { inngest } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeCorporationsEventPayload = {
  data: {
    corporationIds: number[];
    batchSize?: number;
  };
};

type StatsKey = "corporations";

export const scrapeEsiCorporations = inngest.createFunction(
  {
    name: "Scrape Corporations",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/corporations" },
  async ({ step, event }) => {
    // FIXME: THIS SHOULD NOT BE NECESSARY
    axios.defaults.baseURL = "https://esi.evetech.net/latest";

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
