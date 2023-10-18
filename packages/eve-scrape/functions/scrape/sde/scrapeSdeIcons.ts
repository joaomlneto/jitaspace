import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getAllIconIds, getIconById } from "@jitaspace/sde-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeIconsEventPayload = {
  data: {
    batchSize?: number;
  };
};

export const scrapeSdeIcons = client.createFunction(
  {
    id: "scrape-sde-icons",
    name: "Scrape Icons",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/sde/icons" },
  async ({ step, event, logger }) => {
    const stepStartTime = performance.now();

    // Get all Icon IDs in SDE
    const iconIds = await getAllIconIds().then((res) => res.data);
    iconIds.sort((a, b) => a - b);

    console.log({ iconIds });

    const limit = pLimit(20);

    const iconChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.icon
          .findMany({
            where: {
              iconId: {
                in: iconIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          iconIds.map((iconId) =>
            limit(async () =>
              getIconById(iconId)
                .then((res) => res.data)
                .then((icon) => ({
                  iconId: icon.iconID,
                  description: icon.description ?? null,
                  iconFile: icon.iconFile,
                  isDeleted: false,
                })),
            ),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.icon.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.icon.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            iconId: {
              in: entries.map((entry) => entry.iconId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.icon.update({
                data: entry,
                where: { iconId: entry.iconId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.iconId,
    });

    return {
      stats: {
        iconChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
