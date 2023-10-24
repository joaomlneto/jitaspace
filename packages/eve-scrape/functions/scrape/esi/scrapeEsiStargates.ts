import { NonRetriableError } from "inngest";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getUniverseStargatesStargateId } from "@jitaspace/esi-client";

import { client } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeStargatesEventPayload = {
  data: {
    stargateIds: number[];
    batchSize?: number;
  };
};

type StatsKey = "stargates";

export const scrapeEsiStargates = client.createFunction(
  {
    id: "scrape-esi-stargates",
    name: "Scrape Stargates",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/stargates" },
  async ({ step, event }) => {
    const batchSize = event.data.batchSize ?? 1000;
    const stargateIds = event.data.stargateIds;

    if ((event.data.stargateIds ?? []).length == 0)
      throw new NonRetriableError("Invalid stargateIds");

    // Split IDs in batches
    const { batches } = await step.run("Fetch Stargate IDs", async () => {
      stargateIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(stargateIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        stargateIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return {
        batches: [...Array(numBatches).keys()].map((batchId) =>
          batchIds(batchId),
        ),
      };
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          console.log(`starting batch ${i + 1}`);
          const stepStartTime = performance.now();
          const thisBatchStargateIds = batches[i]!;

          const stargateIdsInDatabase = await prisma.stargate
            .findMany({
              select: {
                stargateId: true,
              },
            })
            .then((res) => res.map((stargate) => stargate.stargateId));

          const fetchStargates = async (stargateIds: number[]) =>
            Promise.all(
              stargateIds.map((stargateId) =>
                limit(async () =>
                  getUniverseStargatesStargateId(stargateId)
                    .then((res) => res.data)
                    .then((stargate) => ({
                      stargateId: stargate.stargate_id,
                      name: stargate.name,
                      typeId: stargate.type_id,
                      //position: stargate.position,
                      solarSystemId: stargate.system_id,
                      destinationStargateId: stargate.destination.stargate_id,
                      isDeleted: false,
                    })),
                ),
              ),
            );

          const thisBatchStargates = await fetchStargates(thisBatchStargateIds);

          const missingDestinations = thisBatchStargates
            .map((stargate) => stargate.destinationStargateId)
            .filter(
              (stargateId) =>
                !stargateIdsInDatabase.includes(stargateId) &&
                !thisBatchStargates.some(
                  (stargate) => stargate.stargateId == stargateId,
                ),
            );

          thisBatchStargates.push(
            ...(await fetchStargates(missingDestinations)),
          );

          const stargateChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.stargate
                .findMany({
                  where: {
                    stargateId: {
                      in: thisBatchStargateIds,
                    },
                  },
                })
                .then((entries) =>
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () => thisBatchStargates,
            batchCreate: (entries) => {
              // step one: create stargates, but no links
              return limit(() =>
                prisma.stargate.createMany({
                  data: entries.map((entry) => ({
                    ...entry,
                    destinationStargateId: undefined,
                  })),
                }),
              ).then(() =>
                Promise.all(
                  entries.map((entry) =>
                    limit(async () =>
                      prisma.stargate.update({
                        data: {
                          destinationStargateId: entry.destinationStargateId,
                        },
                        where: {
                          stargateId: entry.stargateId,
                        },
                      }),
                    ),
                  ),
                ),
              );
              //throw new NonRetriableError("XXX");
              // step two: update the stargates with their respective links
              /*
                await Promise.all(
                  entries.map((entry) =>
                    limit(async () =>
                      prisma.stargate.update({
                        data: {
                          destinationStargateId: entry.destinationStargateId,
                        },
                        where: {
                          stargateId: entry.stargateId,
                        },
                      }),
                    ),
                  ),
                );*/
            },
            batchDelete: (entries) =>
              prisma.stargate.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  stargateId: {
                    in: entries.map((entry) => entry.stargateId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.stargate.update({
                      data: entry,
                      where: { stargateId: entry.stargateId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.stargateId,
          });

          return {
            stats: {
              stargates: stargateChanges,
            },
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    const totals: BatchStepResult<StatsKey> = {
      stats: {
        stargates: {
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
