import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getUniverseRaces } from "@jitaspace/esi-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeRacesEventPayload = {
  data: {};
};

export const scrapeEsiRaces = client.createFunction(
  {
    id: "scrape-esi-races",
    name: "Scrape Races",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/races" },
  async ({ step }) => {
    const stepStartTime = performance.now();

    const limit = pLimit(20);

    // Get all Races in ESI
    const races = await getUniverseRaces().then((res) => res.data);
    const raceIds = races.map((race) => race.race_id);

    const raceChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.race
          .findMany({
            where: {
              raceId: {
                in: raceIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        races.map((race) => ({
          raceId: race.race_id,
          name: race.name,
          description: race.description,
          factionId: race.alliance_id,
          isDeleted: false,
        })),

      batchCreate: (entries) =>
        limit(() =>
          prisma.race.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.race.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            raceId: {
              in: entries.map((entry) => entry.raceId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.race.update({
                data: entry,
                where: { raceId: entry.raceId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.raceId,
    });

    await step.sendEvent("Function Finished", {
      name: "scrape/esi/races.finished",
      data: {},
    });

    return {
      stats: {
        raceChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
