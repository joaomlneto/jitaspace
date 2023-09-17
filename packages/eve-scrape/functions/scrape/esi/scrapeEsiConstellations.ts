import { Constellation, prisma } from "@jitaspace/db";
import {
  getUniverseConstellations,
  getUniverseConstellationsConstellationId,
  GetUniverseConstellationsConstellationId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeConstellationEventPayload = {
  data: {};
};

export const scrapeEsiConstellations = inngest.createFunction(
  { name: "Scrape Constellations" },
  { event: "scrape/esi/constellations" },
  async ({ event, step, logger }) => {
    // Get all Constellation IDs in ESI
    const { data: constellationIds } = await getUniverseConstellations();
    logger.info(`going to fetch ${constellationIds.length} constellations`);

    // Get all Constellation details from ESI
    const fetchESIDetailsStartTime = performance.now();
    const constellationResponses = await Promise.all(
      constellationIds.map(async (constellationId) =>
        getUniverseConstellationsConstellationId(constellationId),
      ),
    );
    logger.info(
      `fetched ESI constellations in ${
        performance.now() - fetchESIDetailsStartTime
      }`,
    );

    // extract bodies
    const constellations = constellationResponses.map((res) => res.data);

    // determine which records to be created/updated/removed
    const existingIdsInDb = await prisma.constellation
      .findMany({
        select: {
          constellationId: true,
        },
      })
      .then((constellations) =>
        constellations.map((constellation) => constellation.constellationId),
      );

    const recordsToCreate = constellations.filter(
      (constellation) =>
        !existingIdsInDb.includes(constellation.constellation_id),
    );
    const recordsToUpdate = constellations.filter((constellation) =>
      existingIdsInDb.includes(constellation.constellation_id),
    );
    const recordsToDelete = existingIdsInDb.filter(
      (constellationId) => !constellationIds.includes(constellationId),
    );

    logger.info("records to create:", recordsToCreate.length);
    logger.info("records to update:", recordsToUpdate.length);
    logger.info("records to delete:", recordsToDelete.length);

    const fromEsiToSchema = (
      constellation: GetUniverseConstellationsConstellationId200,
    ): Omit<Constellation, "isDeleted" | "updatedAt"> => ({
      constellationId: constellation.constellation_id,
      name: constellation.name,
      regionId: constellation.region_id,
    });

    // create missing records
    const createRecordsStartTime = performance.now();
    const createResult = await prisma.constellation.createMany({
      data: recordsToCreate.map(fromEsiToSchema),
      skipDuplicates: true,
    });
    logger.info(
      `created records in ${performance.now() - createRecordsStartTime}ms`,
    );

    // update all records with new data
    const updateRecordsStartTime = performance.now();
    const updateResult = await Promise.all(
      recordsToUpdate.map((constellation) =>
        prisma.constellation.update({
          data: fromEsiToSchema(constellation),
          where: { constellationId: constellation.constellation_id },
        }),
      ),
    );
    logger.info(
      `updated records in ${performance.now() - updateRecordsStartTime}ms`,
    );

    // mark records as deleted if missing from ESI
    const deleteRecordsStartTime = performance.now();
    const deleteResult = await prisma.constellation.updateMany({
      data: {
        isDeleted: true,
      },
      where: {
        constellationId: {
          in: recordsToDelete,
        },
      },
    });

    return {
      numCreated: createResult.count,
      numUpdated: updateResult.length,
      numDeleted: deleteResult.count,
    };
  },
);
