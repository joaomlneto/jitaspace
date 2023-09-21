import axios from "axios";
import pLimit from "p-limit";

import { Prisma, prisma } from "@jitaspace/db";
import {
  getUniverseSystems,
  getUniverseSystemsSystemId,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeSolarSystemsEventPayload = {
  data: {
    batchSize?: number;
  };
};

type StatsKey = "solarSystems";
/*
  | "planets"
  | "moons"
  | "stations"
  | "stargates"
  | "starsates"
  | "asteroidBelts";*/

export const scrapeEsiSolarSystems = inngest.createFunction(
  { name: "Scrape Solar Systems" },
  { event: "scrape/esi/solar-systems" },
  async ({ step, event, logger }) => {
    // FIXME: THIS SHOULD NOT BE NECESSARY
    axios.defaults.baseURL = "https://esi.evetech.net/latest";
    const batchSize = event.data.batchSize ?? 500;

    // Get all Solar System IDs in ESI
    const batches = await step.run("Fetch Solar System IDs", async () => {
      const solarSystemIds = await getUniverseSystems().then((res) => res.data);
      solarSystemIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(solarSystemIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        solarSystemIds.slice(
          batchIndex * batchSize,
          (batchIndex + 1) * batchSize,
        );
      return [...Array(numBatches).keys()].map((batchId) => batchIds(batchId));
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();
          const thisBatchIds = batches[i]!;

          const solarSystemChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.solarSystem
                .findMany({
                  where: {
                    solarSystemId: {
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
              Promise.all(
                thisBatchIds.map((solarSystemId) =>
                  limit(async () =>
                    getUniverseSystemsSystemId(solarSystemId)
                      .then((res) => res.data)
                      .then((solarSystem) => ({
                        solarSystemId: solarSystem.system_id,
                        constellationId: solarSystem.constellation_id,
                        name: solarSystem.name,
                        securityClass: solarSystem.security_class ?? null,
                        securityStatus: new Prisma.Decimal(
                          solarSystem.security_status,
                        ),
                        starId: solarSystem.star_id ?? null,
                        isDeleted: false,
                      })),
                  ),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.solarSystem.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.solarSystem.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  solarSystemId: {
                    in: entries.map((entry) => entry.solarSystemId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.solarSystem.update({
                      data: entry,
                      where: { solarSystemId: entry.solarSystemId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.solarSystemId,
          });

          return {
            stats: {
              solarSystems: {
                created: solarSystemChanges.created,
                deleted: solarSystemChanges.deleted,
                modified: solarSystemChanges.modified,
                equal: solarSystemChanges.equal,
              },
            },
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    return await step.run("Compute Aggregates", async () => {
      const totals: BatchStepResult<StatsKey> = {
        stats: {
          solarSystems: {
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
    });
  },
);
