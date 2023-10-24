import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getAllStationServiceIds,
  getStationServiceById,
} from "@jitaspace/sde-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeStationServicesEventPayload = {
  data: {
    batchSize?: number;
  };
};

export const scrapeSdeStationServices = client.createFunction(
  {
    id: "scrape-sde-station-services",
    name: "Scrape Station Services",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/sde/station-services" },
  async ({ step, event, logger }) => {
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
            limit(async () =>
              getStationServiceById(stationServiceId)
                .then((res) => res.data)
                .then((stationService) => ({
                  stationServiceId: stationService.stationServiceID,
                  name: stationService.serviceNameID.en ?? null,
                  description: stationService.descriptionID?.en ?? null,
                  isDeleted: false,
                })),
            ),
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
);
