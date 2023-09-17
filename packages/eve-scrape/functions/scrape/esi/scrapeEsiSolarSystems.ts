import pLimit from "p-limit";

import { Prisma, prisma, SolarSystem } from "@jitaspace/db";
import {
  getUniverseSystems,
  getUniverseSystemsSystemId,
  GetUniverseSystemsSystemId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeSolarSystemsEventPayload = {
  data: {};
};

export const scrapeEsiSolarSystems = inngest.createFunction(
  { name: "Scrape Solar Systems" },
  { event: "scrape/esi/solar-systems" },
  async ({ event, step, logger }) => {
    // Get all Solar System IDs in ESI
    const { data: solarSystemIds } = await getUniverseSystems();
    logger.info(`going to fetch ${solarSystemIds.length} solar systems`);

    // Get all Solar System details from ESI
    const fetchESIDetailsStartTime = performance.now();
    const limit = pLimit(20);

    const solarSystemDetailsPromises = solarSystemIds.map((solarSystemId) =>
      limit(async () => {
        return getUniverseSystemsSystemId(solarSystemId);
      }),
    );
    const solarSystemResponses = await Promise.all(solarSystemDetailsPromises);
    logger.info(
      `fetched ESI solar systems in ${
        performance.now() - fetchESIDetailsStartTime
      }`,
    );

    // extract bodies
    const solarSystems = solarSystemResponses.map((res) => res.data);

    // determine which records to be created/updated/removed
    const existingIdsInDb = await prisma.solarSystem
      .findMany({
        select: {
          solarSystemId: true,
        },
      })
      .then((solarSystems) =>
        solarSystems.map((solarSystem) => solarSystem.solarSystemId),
      );

    const recordsToCreate = solarSystems.filter(
      (solarSystem) => !existingIdsInDb.includes(solarSystem.system_id),
    );
    const recordsToUpdate = solarSystems.filter((solarSystem) =>
      existingIdsInDb.includes(solarSystem.system_id),
    );
    const recordsToDelete = existingIdsInDb.filter(
      (solarSystemId) => !solarSystemIds.includes(solarSystemId),
    );

    logger.info("records to create:", recordsToCreate.length);
    logger.info("records to update:", recordsToUpdate.length);
    logger.info("records to delete:", recordsToDelete.length);

    const fromEsiToSchema = (
      solarSystem: GetUniverseSystemsSystemId200,
    ): Omit<SolarSystem, "isDeleted" | "updatedAt"> => ({
      solarSystemId: solarSystem.system_id,
      constellationId: solarSystem.constellation_id,
      name: solarSystem.name,
      securityClass: solarSystem.security_class ?? null,
      securityStatus: new Prisma.Decimal(solarSystem.security_status),
      starId: solarSystem.star_id ?? null,
    });

    // create missing records
    const createRecordsStartTime = performance.now();
    const createResult = await prisma.solarSystem.createMany({
      data: recordsToCreate.map(fromEsiToSchema),
      skipDuplicates: true,
    });
    logger.info(
      `created records in ${performance.now() - createRecordsStartTime}ms`,
    );

    // update all records with new data
    const updateRecordsStartTime = performance.now();
    const updateResult = await Promise.all(
      recordsToUpdate.map((solarSystem) =>
        prisma.solarSystem.update({
          data: fromEsiToSchema(solarSystem),
          where: { solarSystemId: solarSystem.system_id },
        }),
      ),
    );
    logger.info(
      `updated records in ${performance.now() - updateRecordsStartTime}ms`,
    );

    // mark records as deleted if missing from ESI
    const deleteRecordsStartTime = performance.now();
    const deleteResult = await prisma.solarSystem.updateMany({
      data: {
        isDeleted: true,
      },
      where: {
        solarSystemId: {
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
