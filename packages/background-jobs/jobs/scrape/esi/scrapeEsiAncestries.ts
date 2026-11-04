import pLimit from "p-limit";

import { getUniverseAncestries } from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { SDE_OWNED_ANCESTRY_COLUMNS } from "../../../helpers";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeAncestriesEventPayload {
  data: Record<string, never>;
}

export const scrapeEsiAncestries = defineJob<
  ScrapeAncestriesEventPayload["data"]
>({
  id: "scrape-esi-ancestries",
  name: "Scrape Ancestries",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();

    const limit = pLimit(20);

    // Get all Ancestries in ESI
    const ancestries = await getUniverseAncestries().then((res) => res.data);
    const ancestryIds = ancestries.map((ancestry) => ancestry.id);

    // `Icon` is filled by the SDE ingest, which runs after this scrape on a
    // fresh database: keep an unknown icon null rather than break the FK.
    const iconIds = new Set(
      await prisma.icon
        .findMany({ select: { iconId: true } })
        .then((entries) => entries.map((entry) => entry.iconId)),
    );

    const ancestryChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.ancestry
          .findMany({
            where: {
              ancestryId: {
                in: ancestryIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) =>
              excludeObjectKeys(entry, [
                "updatedAt",
                "createdAt",
                ...SDE_OWNED_ANCESTRY_COLUMNS,
              ]),
            ),
          ),
      fetchRemoteEntries: () =>
        Promise.resolve(
          ancestries.map((ancestry) => ({
            ancestryId: ancestry.id,
            name: ancestry.name,
            shortDescription: ancestry.short_description ?? null,
            description: ancestry.description,
            iconId:
              ancestry.icon_id && iconIds.has(ancestry.icon_id)
                ? ancestry.icon_id
                : null,
            bloodlineId: ancestry.bloodline_id,
            isDeleted: false,
          })),
        ),

      batchCreate: (entries) =>
        limit(() =>
          prisma.ancestry.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.ancestry.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            ancestryId: {
              in: entries.map((entry) => entry.ancestryId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.ancestry.update({
                data: entry,
                where: { ancestryId: entry.ancestryId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.ancestryId,
    });

    return {
      stats: {
        ancestryChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
