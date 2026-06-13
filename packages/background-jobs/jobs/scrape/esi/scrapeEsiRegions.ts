import pLimit from "p-limit";

import {
  getUniverseRegions,
  getUniverseRegionsRegionId,
} from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeRegionEventPayload {
  data: {};
}

export const scrapeEsiRegions = defineJob<ScrapeRegionEventPayload["data"]>({
  id: "scrape-esi-regions",
  name: "Scrape Regions",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    // Get all Region IDs in ESI
    const regionIds = await getUniverseRegions().then((res) => res.data);
    regionIds.sort((a, b) => a - b);

    const limit = pLimit(20);

    const stepStartTime = performance.now();
    const thisBatchIds = regionIds;

    const regionChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.region
          .findMany({
            where: {
              regionId: {
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
        Promise.all(
          thisBatchIds.map((regionId) =>
            limit(async () =>
              getUniverseRegionsRegionId(regionId)
                .then((res) => res.data)
                .then((region) => ({
                  regionId: region.region_id,
                  name: region.name,
                  description: region.description ?? null,
                  isDeleted: false,
                })),
            ),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.region.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.region.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            regionId: {
              in: entries.map((entry) => entry.regionId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.region.update({
                data: entry,
                where: { regionId: entry.regionId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.regionId,
    });

    return {
      stats: {
        regions: {
          created: regionChanges.created,
          deleted: regionChanges.deleted,
          modified: regionChanges.modified,
          equal: regionChanges.equal,
        },
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
