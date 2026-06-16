import pLimit from "p-limit";

import {
  getAllStationServiceIds,
  getStationServiceById,
} from "@jitaspace/sde-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeStationServicesEventPayload {
  data: {
    batchSize?: number;
  };
}

// Extracted to keep the per-service fetch from nesting too deeply.
const fetchRemoteStationService = (
  limit: ReturnType<typeof pLimit>,
  stationServiceId: number,
) =>
  limit(async () =>
    getStationServiceById(stationServiceId)
      .then((res) => res.data)
      .then((stationService) => ({
        stationServiceId: stationService.stationServiceID,
        name: stationService.serviceName.en ?? null,
        description: stationService.description?.en ?? null,
        isDeleted: false,
      })),
  );

export const scrapeSdeStationServices = defineJob<
  ScrapeStationServicesEventPayload["data"]
>({
  id: "scrape-sde-station-services",
  name: "Scrape Station Services",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();

    // Get all Station Service IDs in SDE
    const stationServiceIds = await getAllStationServiceIds().then(
      (res) => res.data,
    );
    stationServiceIds.sort((a, b) => a - b);

    console.log({ stationServiceIds });

    const limit = pLimit(20);

    const stationServicesChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.stationService
          .findMany({
            where: {
              stationServiceId: {
                in: stationServiceIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          stationServiceIds.map((stationServiceId) =>
            fetchRemoteStationService(limit, stationServiceId),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.stationService.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.stationService.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            stationServiceId: {
              in: entries.map((entry) => entry.stationServiceId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.stationService.update({
                data: entry,
                where: { stationServiceId: entry.stationServiceId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.stationServiceId,
    });

    return {
      stats: {
        stationServicesChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
