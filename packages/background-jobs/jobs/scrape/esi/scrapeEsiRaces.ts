import pLimit from "p-limit";

import { getUniverseRaces } from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeRacesEventPayload {
  data: Record<string, never>;
}

export const scrapeEsiRaces = defineJob<ScrapeRacesEventPayload["data"]>({
  id: "scrape-esi-races",
  name: "Scrape Races",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();

    const limit = pLimit(20);

    // Get all Races in ESI
    const races = await getUniverseRaces().then((res) => res.data);
    const raceIds = races.map((race) => race.race_id);

    await createCorpAndItsRefRecords({
      missingRaceIds: new Set(raceIds),
    });

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
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () =>
        Promise.resolve(
          races.map((race) => ({
            raceId: race.race_id,
            name: race.name,
            description: race.description,
            factionId: race.alliance_id,
            isDeleted: false,
          })),
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

    return {
      stats: {
        raceChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
