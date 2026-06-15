import pLimit from "p-limit";

import { getAllRaceIds, getRaceById } from "@jitaspace/sde-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeSdeRacesEventPayload {
  data: {
    batchSize?: number;
  };
}

const fetchRace = (raceId: number, limit: ReturnType<typeof pLimit>) =>
  limit(async () =>
    getRaceById(raceId)
      .then((res) => res.data)
      .then((race) => {
        const name = race.name.en;
        if (name === undefined) {
          throw new Error(`Race ${race.raceID} is missing an English name`);
        }
        return {
          raceId: race.raceID,
          name,
          description: race.description.en ?? null,
          isDeleted: false,
        };
      }),
  );

export const scrapeSdeRaces = defineJob<ScrapeSdeRacesEventPayload["data"]>({
  id: "scrape-sde-races",
  name: "Scrape Races",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
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
        Promise.all(raceIds.map((raceId) => fetchRace(raceId, limit))),
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

    return {
      stats: {
        racesChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
