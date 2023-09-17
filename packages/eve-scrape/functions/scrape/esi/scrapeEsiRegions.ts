import { prisma, Region } from "@jitaspace/db";
import {
  getUniverseRegions,
  getUniverseRegionsRegionId,
  GetUniverseRegionsRegionId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeRegionEventPayload = {
  data: {};
};

export const scrapeEsiRegions = inngest.createFunction(
  { name: "Scrape Regions" },
  { event: "scrape/esi/regions" },
  async ({ event, step, logger }) => {
    // Get all Region IDs in ESI
    const { data: regionIds } = await getUniverseRegions();
    logger.info(`going to fetch ${regionIds.length} regions`);

    // Get all Region details from ESI
    const fetchESIDetailsStartTime = performance.now();
    const regionResponses = await Promise.all(
      regionIds.map(async (regionId) => getUniverseRegionsRegionId(regionId)),
    );
    logger.info(
      `fetched ESI regions in ${performance.now() - fetchESIDetailsStartTime}`,
    );

    // extract bodies
    const regions = regionResponses.map((res) => res.data);

    // determine which records to be created/updated/removed
    const existingIdsInDb = await prisma.region
      .findMany({
        select: {
          regionId: true,
        },
      })
      .then((regions) => regions.map((region) => region.regionId));

    const recordsToCreate = regions.filter(
      (region) => !existingIdsInDb.includes(region.region_id),
    );
    const recordsToUpdate = regions.filter((region) =>
      existingIdsInDb.includes(region.region_id),
    );
    const recordsToDelete = existingIdsInDb.filter(
      (regionId) => !regionIds.includes(regionId),
    );

    logger.info("records to create:", recordsToCreate.length);
    logger.info("records to update:", recordsToUpdate.length);
    logger.info("records to delete:", recordsToDelete.length);

    const fromEsiToSchema = (
      region: GetUniverseRegionsRegionId200,
    ): Omit<Region, "updatedAt"> => ({
      regionId: region.region_id,
      name: region.name,
      description: region.description ?? null,
      isDeleted: false,
    });

    // create missing regions
    const createRecordsStartTime = performance.now();
    const createResult = await prisma.region.createMany({
      data: recordsToCreate.map(fromEsiToSchema),
      skipDuplicates: true,
    });
    logger.info(
      `created records in ${performance.now() - createRecordsStartTime}ms`,
    );

    // update all regions with new data
    const updateRecordsStartTime = performance.now();
    const updateResult = await Promise.all(
      recordsToUpdate.map((region) =>
        prisma.region.update({
          data: fromEsiToSchema(region),
          where: { regionId: region.region_id },
        }),
      ),
    );
    logger.info(
      `updated records in ${performance.now() - updateRecordsStartTime}ms`,
    );

    // mark regions as deleted if missing from ESI
    const deleteRecordsStartTime = performance.now();
    const deleteResult = await prisma.region.updateMany({
      data: {
        isDeleted: true,
      },
      where: {
        regionId: {
          in: recordsToDelete,
        },
      },
    });
    logger.info(
      `deleted records in ${performance.now() - deleteRecordsStartTime}ms`,
    );

    return {
      numCreated: createResult.count,
      numUpdated: updateResult.length,
      numDeleted: deleteResult.count,
    };
  },
);
