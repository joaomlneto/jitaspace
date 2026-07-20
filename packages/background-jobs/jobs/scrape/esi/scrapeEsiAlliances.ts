import pLimit from "p-limit";

import {
  getAlliances,
  getAlliancesAllianceIdCorporations,
} from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob } from "../../../core";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";

export interface ScrapeAlliancesEventPayload {
  data: {
    batchSize?: number;
  };
}

type StatsKey = "alliances";

type LimitFunction = ReturnType<typeof pLimit>;

const fetchAllianceMemberCorporations = (
  allianceId: number,
  limit: LimitFunction,
) =>
  limit(async () =>
    getAlliancesAllianceIdCorporations(allianceId).then((res) => res.data),
  );

export const scrapeEsiAlliances = defineJob<
  ScrapeAlliancesEventPayload["data"]
>({
  id: "scrape-esi-alliances",
  name: "Scrape Alliances",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 10;

    // Get all Alliance IDs in ESI
    const batches = await ctx.run("Fetch Alliance IDs", async () => {
      const allianceIds = await getAlliances().then((res) => res.data);
      allianceIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(allianceIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        allianceIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return [...new Array(numBatches).keys()].map((batchId) =>
        batchIds(batchId),
      );
    });

    type StepResult = BatchStepResult<StatsKey>;
    const results: StepResult[] = [];
    const limit = pLimit(1);

    for (const [i, thisBatchIds] of batches.entries()) {
      const result = await ctx.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<StepResult> => {
          const stepStartTime = performance.now();

          const esiAllianceMemberCorporations = (
            await Promise.all(
              thisBatchIds.map((allianceId) =>
                fetchAllianceMemberCorporations(allianceId, limit),
              ),
            )
          ).flat();

          ctx.logger.info({
            allianceIds: thisBatchIds,
            corporationIds: esiAllianceMemberCorporations,
          });

          await createCorpAndItsRefRecords({
            missingAllianceIds: new Set(thisBatchIds),
            missingCorporationIds: new Set(esiAllianceMemberCorporations),
          });

          /*

          const esiAlliances = await Promise.all(
            thisBatchIds.map((allianceId) =>
              limit(async () =>
                getAlliancesAllianceId(allianceId).then((res) => ({
                  allianceId,
                  ...res.data,
                })),
              ),
            ),
          );

          const creatorCorporationIds = esiAlliances.map(
            (alliance) => alliance.creator_corporation_id,
          );
          const executorCorporationIds = esiAlliances

            .map((alliance) => alliance.executor_corporation_id)
            .filter((id) => id) as number[]; // FIXME shouldn't need to cast

          const corporationIds = [
            ...new Set([...creatorCorporationIds, ...executorCorporationIds]),
          ];

          const characterIds = esiAlliances.map(
            (alliance) => alliance.creator_id,
          );

          const allianceChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.alliance
                .findMany({
                  where: {
                    allianceId: {
                      in: thisBatchIds,
                    },
                  },
                })
                .then((entries) =>
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              esiAlliances.map((alliance) => ({
                allianceId: alliance.allianceId,
                creatorCorporationId: alliance.creator_corporation_id,
                dateFounded: new Date(alliance.date_founded),
                executorCorporationId: alliance.executor_corporation_id ?? null,
                factionId: alliance.faction_id ?? null,
                name: alliance.name,
                ticker: alliance.ticker,
                isDeleted: false,
              })),
            batchCreate: (entries) =>
              limit(() =>
                prisma.alliance.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.alliance.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  allianceId: {
                    in: entries.map((entry) => entry.allianceId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.alliance.update({
                      data: entry,
                      where: { allianceId: entry.allianceId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.allianceId,
          });*/

          return {
            stats: {
              alliances: {
                created: 0,
                deleted: 0,
                modified: 0,
                equal: 0,
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
        alliances: {
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
