import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getAllDogmaUnitIds, getDogmaUnitById } from "@jitaspace/sde-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeDogmaUnitsEventPayload = {
  data: {
    batchSize?: number;
  };
};

type StatsKey = "dogmaAttributes";

export const scrapeSdeDogmaUnits = client.createFunction(
  {
    id: "scrape-sde-dogma-units",
    name: "Scrape Dogma Units",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/sde/dogma-units" },
  async ({ step, event, logger }) => {
    const stepStartTime = performance.now();

    // Get all Dogma Attribute IDs in SDE (via Hoboleaks)
    const unitIds = await getAllDogmaUnitIds().then((res) => res.data);
    unitIds.sort((a, b) => a - b);

    const limit = pLimit(20);

    const dogmaUnitsChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.dogmaUnit
          .findMany({
            where: {
              unitId: {
                in: unitIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          unitIds.map((unitId) =>
            limit(async () =>
              getDogmaUnitById(unitId)
                .then((res) => res.data)
                .then((dogmaUnit) => ({
                  unitId: unitId,
                  name: dogmaUnit.name,
                  description: dogmaUnit.description ?? null,
                  displayName: dogmaUnit.displayName ?? null,
                  isDeleted: false,
                })),
            ),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.dogmaUnit.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.dogmaUnit.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            unitId: {
              in: entries.map((entry) => entry.unitId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.dogmaUnit.update({
                data: entry,
                where: { unitId: entry.unitId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.unitId,
    });

    return {
      stats: {
        dogmaUnitsChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
