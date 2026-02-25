import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getAllRaceIds, getRaceById } from "@jitaspace/sde-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeSdeRacesEventPayload = {
  data: {
    batchSize?: number;
  };
};

export const scrapeSdeRaces = client.createFunction(
  {
    id: "scrape-sde-races",
    name: "Scrape Races",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/sde/races" },
  async ({ step, event, logger }) => {
    const stepStartTime = performance.now();

    // Get all Race IDs in SDE
    const raceIds = await getAllRaceIds().then((res) => res.data);
    raceIds.sort((a, b) => a - b);

    console.log({ raceIds });

    const limit = pLimit(20);

    const racesChanges = await updateTable({
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
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "factionId"]),
            ),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          raceIds.map((raceId) =>
            limit(async () =>
              getRaceById(raceId)
                .then((res) => res.data)
                .then((race) => ({
                  raceId: race.raceID,
                  name: race.name.en!,
                  description: race.description.en ?? null,
                  isDeleted: false,
                })),
            ),
          ),
        ),
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
      name: "scrape/sde/races.finished",
      data: {},
    });

    return {
      stats: {
        racesChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
