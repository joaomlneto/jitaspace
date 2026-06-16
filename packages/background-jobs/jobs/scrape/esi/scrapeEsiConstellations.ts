import pLimit from "p-limit";

import {
  getUniverseConstellations,
  getUniverseConstellationsConstellationId,
} from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

const fetchConstellation = (constellationId: number) =>
  getUniverseConstellationsConstellationId(constellationId)
    .then((res) => res.data)
    .then((constellation) => ({
      constellationId: constellation.constellation_id,
      name: constellation.name,
      regionId: constellation.region_id,
      isDeleted: false,
    }));

export interface ScrapeConstellationEventPayload {
  data: Record<string, never>;
}

export const scrapeEsiConstellations = defineJob<
  ScrapeConstellationEventPayload["data"]
>({
  id: "scrape-esi-constellations",
  name: "Scrape Constellations",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();

    // Get all Constellation IDs in ESI
    const constellationIds = await getUniverseConstellations().then(
      (res) => res.data,
    );
    constellationIds.sort((a, b) => a - b);

    const limit = pLimit(20);

    const constellationChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.constellation
          .findMany({
            where: {
              constellationId: {
                in: constellationIds,
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
          constellationIds.map((constellationId) =>
            limit(() => fetchConstellation(constellationId)),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.constellation.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.constellation.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            constellationId: {
              in: entries.map((entry) => entry.constellationId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.constellation.update({
                data: entry,
                where: { constellationId: entry.constellationId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.constellationId,
    });

    return {
      stats: {
        constellations: {
          created: constellationChanges.created,
          deleted: constellationChanges.deleted,
          modified: constellationChanges.modified,
          equal: constellationChanges.equal,
        },
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
