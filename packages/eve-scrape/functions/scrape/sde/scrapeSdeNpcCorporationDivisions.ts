import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getAllNpcCorporationDivisionIds,
  getNpcCorporationDivisionById,
} from "@jitaspace/sde-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeNpcCorporationDivisionsEventPayload = {
  data: {
    batchSize?: number;
  };
};

export const scrapeSdeNpcCorporationDivisions = client.createFunction(
  {
    id: "scrape-sde-npc-corporation-divisions",
    name: "Scrape NPC Corporation Divisions",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/sde/npc-corporation-divisions" },
  async ({ step, event, logger }) => {
    const stepStartTime = performance.now();

    // Get all Station Service IDs in SDE
    const corporationDivisionIds = await getAllNpcCorporationDivisionIds().then(
      (res) => res.data,
    );
    corporationDivisionIds.sort((a, b) => a - b);

    console.log({ corporationDivisionIds });

    const limit = pLimit(20);

    const corporationDivisionChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.npcCorporationDivision
          .findMany({
            where: {
              npcCorporationDivisionId: {
                in: corporationDivisionIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          corporationDivisionIds.map((corporationDivisionId) =>
            limit(async () =>
              getNpcCorporationDivisionById(corporationDivisionId)
                .then((res) => res.data)
                .then((corporationDivision) => ({
                  npcCorporationDivisionId:
                    corporationDivision.npcCorporationDivisionID,
                  name:
                    corporationDivision.name.en ??
                    corporationDivision.displayName,
                  internalName: corporationDivision.internalName,
                  leaderTypeName:
                    corporationDivision.leaderTypeName.en ?? null,
                  isDeleted: false,
                })),
            ),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.npcCorporationDivision.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.npcCorporationDivision.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            npcCorporationDivisionId: {
              in: entries.map((entry) => entry.npcCorporationDivisionId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.npcCorporationDivision.update({
                data: entry,
                where: {
                  npcCorporationDivisionId: entry.npcCorporationDivisionId,
                },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.npcCorporationDivisionId,
    });

    await step.sendEvent("Function Finished", {
      name: "scrape/sde/npc-corporation-divisions.finished",
      data: {},
    });

    return {
      stats: {
        corporationDivisionChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
