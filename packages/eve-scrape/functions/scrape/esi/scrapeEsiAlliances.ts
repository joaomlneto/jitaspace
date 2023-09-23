import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getAlliances, getAlliancesAllianceId } from "@jitaspace/esi-client";

import { inngest } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeAlliancesEventPayload = {
  data: {
    batchSize?: number;
  };
};

type StatsKey = "alliances";

export const scrapeEsiAlliances = inngest.createFunction(
  {
    name: "Scrape Alliances",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/alliances" },
  async ({ step, event }) => {
    // FIXME: THIS SHOULD NOT BE NECESSARY
    axios.defaults.baseURL = "https://esi.evetech.net/latest";
    const batchSize = event.data.batchSize ?? 1000;

    // Get all Alliance IDs in ESI
    const batches = await step.run("Fetch Alliance IDs", async () => {
      const allianceIds = await getAlliances().then((res) => res.data);
      allianceIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(allianceIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        allianceIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return [...Array(numBatches).keys()].map((batchId) => batchIds(batchId));
    });

    type StepResult = BatchStepResult<StatsKey> & {
      corporationIds: number[];
      characterIds: number[];
    };
    let results: StepResult[] = [];
    const limit = pLimit(20);

    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<StepResult> => {
          const stepStartTime = performance.now();
          const thisBatchIds = batches[i]!;

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
                    excludeObjectKeys(entry, ["updatedAt"]),
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
          });

          return {
            stats: {
              alliances: allianceChanges,
            },
            characterIds,
            corporationIds,
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    // scrape linked corporations
    await step.sendEvent({
      name: "scrape/esi/corporations",
      data: {
        corporationIds: [
          ...new Set(results.flatMap((result) => result.corporationIds)),
        ],
      },
    });

    // TODO: scrape linked characters
    /*
    await step.sendEvent({
      name: "scrape/esi/corporations",
      data: {
        corporationIds: results.flatMap((result) => result.corporationIds),
      },
    });*/

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
);
