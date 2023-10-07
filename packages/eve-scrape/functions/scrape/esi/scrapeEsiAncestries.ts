import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getUniverseAncestries } from "@jitaspace/esi-client-kubb";

import { inngest } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeAncestriesEventPayload = {
  data: {};
};

export const scrapeEsiAncestries = inngest.createFunction(
  {
    name: "Scrape Ancestries",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/ancestries" },
  async () => {
    const stepStartTime = performance.now();

    const limit = pLimit(20);

    // Get all Ancestries in ESI
    const ancestries = await getUniverseAncestries();
    const ancestryIds = ancestries.map((ancestry) => ancestry.id);

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
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        ancestries.map((ancestry) => ({
          ancestryId: ancestry.id,
          name: ancestry.name,
          shortDescription: ancestry.short_description ?? null,
          description: ancestry.description,
          iconId: ancestry.icon_id ?? null,
          bloodlineId: ancestry.bloodline_id,
          isDeleted: false,
        })),

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
);
