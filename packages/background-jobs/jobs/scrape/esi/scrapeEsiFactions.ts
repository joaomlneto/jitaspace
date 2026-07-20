import pLimit from "p-limit";

import { getUniverseFactions } from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeFactionsEventPayload {
  data: Record<string, never>;
}

export const scrapeEsiFactions = defineJob<ScrapeFactionsEventPayload["data"]>({
  id: "scrape-esi-factions",
  name: "Scrape Factions",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();

    const limit = pLimit(20);

    // Get all Factions in ESI
    const factions = await getUniverseFactions().then((res) => res.data);
    const factionIds = factions.map((faction) => faction.faction_id);

    await createCorpAndItsRefRecords({
      missingFactionIds: new Set(factionIds),
    });

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
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () =>
        Promise.resolve(
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
        ),

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

    return {
      stats: {
        factionChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
