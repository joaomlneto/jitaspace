import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeDogmaUnitsEventPayload = {
  data: {};
};

export const scrapeHoboleaksDogmaUnits = client.createFunction(
  {
    id: "scrape-hoboleaks-dogma-units",
    name: "Scrape Dogma Units",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/hoboleaks/dogma-units" },
  async ({ step }) => {
    const stepStartTime = performance.now();

    // Get all Dogma Units in Hoboleaks
    const dogmaUnits: Record<
      number,
      { displayName?: string; description?: string; name: string }
    > = await fetch("https://sde.hoboleaks.space/tq/dogmaunits.json").then(
      (res) => res.json(),
    );

    const dogmaUnitIds = Object.keys(dogmaUnits).map((k) => Number(k));

    const limit = pLimit(20);

    const agentTypeChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.dogmaUnit
          .findMany({
            where: {
              unitId: {
                in: dogmaUnitIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Object.entries(dogmaUnits).map(([unitId, dogmaUnit]) => ({
          unitId: Number(unitId),
          name: dogmaUnit.name,
          description: dogmaUnit.description ?? null,
          displayName: dogmaUnit.displayName ?? null,
          isDeleted: false,
        })),
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

    await step.sendEvent("Function Finished", {
      name: "scrape/hoboleaks/dogma-units.finished",
      data: {},
    });

    return {
      stats: {
        agentTypeChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
