import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getUniverseFactions } from "@jitaspace/esi-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeFactionsEventPayload = {
  data: {};
};

export const scrapeEsiFactions = client.createFunction(
  {
    id: "scrape-esi-factions",
    name: "Scrape Factions",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/factions" },
  async ({ step }) => {
    const stepStartTime = performance.now();

    const limit = pLimit(20);

    // Get all Factions in ESI
    const factions = await getUniverseFactions().then((res) => res.data);
    const factionIds = factions.map((faction) => faction.faction_id);

    const factionChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.faction
          .findMany({
            where: {
              factionId: {
                in: factionIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        factions.map((faction) => ({
          factionId: faction.faction_id,
          corporationId: faction.corporation_id ?? null,
          description: faction.description,
          isUnique: faction.is_unique,
          militiaCorporationId: faction.militia_corporation_id ?? null,
          name: faction.name,
          sizeFactor: faction.size_factor,
          solarSystemId: faction.solar_system_id ?? null,
          stationCount: faction.station_count,
          stationSystemCount: faction.station_system_count,
          isDeleted: false,
        })),

      batchCreate: (entries) =>
        limit(() =>
          prisma.faction.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.faction.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            factionId: {
              in: entries.map((entry) => entry.factionId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.faction.update({
                data: entry,
                where: { factionId: entry.factionId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.factionId,
    });

    await step.sendEvent("Function Finished", {
      name: "scrape/esi/factions.finished",
      data: {},
    });

    return {
      stats: {
        factionChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
