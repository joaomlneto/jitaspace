import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getUniverseConstellations,
  getUniverseConstellationsConstellationId,
} from "@jitaspace/esi-client-kubb";

import { inngest } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeConstellationEventPayload = {
  data: {};
};

export const scrapeEsiConstellations = inngest.createFunction(
  {
    name: "Scrape Constellations",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/constellations" },
  async ({}) => {
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
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          constellationIds.map((constellationId) =>
            limit(async () =>
              getUniverseConstellationsConstellationId(constellationId)
                .then((res) => res.data)
                .then((constellation) => ({
                  constellationId: constellation.constellation_id,
                  name: constellation.name,
                  regionId: constellation.region_id,
                  isDeleted: false,
                })),
            ),
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
);
