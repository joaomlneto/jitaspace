import pLimit from "p-limit";

import { getUniverseStargatesStargateId } from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob, NonRetriableError } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeStargatesEventPayload {
  data: {
    stargateIds?: number[];
    batchSize?: number;
  };
}

type StatsKey = "stargates";

const processStargateBatch = async (
  thisBatchStargateIds: number[],
  batchIndex: number,
  limit: ReturnType<typeof pLimit>,
): Promise<BatchStepResult<StatsKey>> => {
  console.log(`starting batch ${batchIndex + 1}`);
  const stepStartTime = performance.now();

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
        limit(async () => {
          const { data: stargate } =
            await getUniverseStargatesStargateId(stargateId);
          return {
            stargateId: stargate.stargate_id,
            name: stargate.name,
            typeId: stargate.type_id,
            //position: stargate.position,
            solarSystemId: stargate.system_id,
            destinationStargateId: stargate.destination.stargate_id,
            isDeleted: false,
          };
        }),
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

  thisBatchStargates.push(...(await fetchStargates(missingDestinations)));

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
            excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
          ),
        ),
    fetchRemoteEntries: () => Promise.resolve(thisBatchStargates),
    batchCreate: async (entries) => {
      // step one: create stargates, but no links
      await limit(() =>
        prisma.stargate.createMany({
          data: entries.map((entry) => ({
            ...entry,
            destinationStargateId: undefined,
          })),
        }),
      );
      // step two: update the stargates with their respective links
      return Promise.all(
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
      );
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
};

export const scrapeEsiStargates = defineJob<
  ScrapeStargatesEventPayload["data"]
>({
  id: "scrape-esi-stargates",
  trigger: { type: "event" },
  name: "Scrape Stargates",
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 1000;
    const stargateIds = ctx.payload.stargateIds ?? [];

    if (stargateIds.length == 0)
      throw new NonRetriableError("Invalid stargateIds");

    // Split IDs in batches
    const { batches } = await ctx.run("Fetch Stargate IDs", () => {
      stargateIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(stargateIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        stargateIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return Promise.resolve({
        batches: [...new Array(numBatches).keys()].map((batchId) =>
          batchIds(batchId),
        ),
      });
    });

    const results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    for (const [i, batch] of batches.entries()) {
      const result = await ctx.run(`Batch ${i + 1}/${batches.length}`, () =>
        processStargateBatch(batch, i, limit),
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
});
