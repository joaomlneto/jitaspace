import pLimit from "p-limit";

import { getUniverseStationsStationId } from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob, NonRetriableError } from "../../../core";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeStationsEventPayload {
  data: {
    stationIds: number[];
    batchSize?: number;
  };
}

type StatsKey = "stations";

const fetchStation = (stationId: number, limit: ReturnType<typeof pLimit>) =>
  limit(async () =>
    getUniverseStationsStationId(stationId)
      .then((res) => res.data)
      .then((station) => ({
        stationId: station.station_id,
        name: station.name,
        solarSystemId: station.system_id === 1 ? null : station.system_id,
        typeId: station.type_id,
        maxDockableShipVolume: station.max_dockable_ship_volume,
        officeRentalCost: station.office_rental_cost,
        ownerId: station.owner ?? null,
        raceId: station.race_id ?? null,
        reprocessingEfficiency: station.reprocessing_efficiency,
        reprocessingStationsTake: station.reprocessing_stations_take,
        isDeleted: false,
      })),
  );

export const scrapeEsiStations = defineJob<ScrapeStationsEventPayload["data"]>({
  id: "scrape-esi-stations",
  trigger: { type: "event" },
  name: "Scrape Stations",
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 1000;
    const stationIds = ctx.payload.stationIds ?? [];

    if (ctx.payload.stationIds.length == 0)
      throw new NonRetriableError("Invalid station IDs");

    // Split IDs in batches
    const { batches } = await ctx.run("Fetch Station IDs", async () => {
      stationIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(stationIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        stationIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return {
        batches: [...new Array(numBatches).keys()].map((batchId) =>
          batchIds(batchId),
        ),
      };
    });

    const results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    for (let i = 0; i < batches.length; i++) {
      const result = await ctx.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<(typeof results)[number]> => {
          console.log(`starting batch ${i + 1}`);
          const stepStartTime = performance.now();
          const thisBatchStationIds = batches[i]!;

          await createCorpAndItsRefRecords({
            missingStationIds: new Set(thisBatchStationIds),
          });

          const fetchStations = async (stationIds: number[]) =>
            Promise.all(
              stationIds.map((stationId) => fetchStation(stationId, limit)),
            );

          const thisBatchStations = await fetchStations(thisBatchStationIds);

          const stripTimestamps = <
            T extends { updatedAt: unknown; createdAt: unknown },
          >(
            entries: T[],
          ) =>
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            );

          const stationChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.station
                .findMany({
                  where: {
                    stationId: {
                      in: thisBatchStationIds,
                    },
                  },
                })
                .then(stripTimestamps),
            fetchRemoteEntries: async () => thisBatchStations,
            batchCreate: (entries) =>
              limit(() =>
                prisma.station.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.station.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  stationId: {
                    in: entries.map((entry) => entry.stationId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.station.update({
                      data: entry,
                      where: { stationId: entry.stationId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.stationId,
          });

          return {
            stats: {
              stations: stationChanges,
            },
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    const totals: BatchStepResult<StatsKey> = {
      stats: {
        stations: {
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
