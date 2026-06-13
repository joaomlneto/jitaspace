import pLimit from "p-limit";

import { getAllIconIds, getIconById } from "@jitaspace/sde-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeIconsEventPayload {
  data: {
    batchSize?: number;
  };
}

export const scrapeSdeIcons = defineJob<ScrapeIconsEventPayload["data"]>({
  id: "scrape-sde-icons",
  name: "Scrape Icons",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();

    // Get all Icon IDs in SDE
    const iconIds = await getAllIconIds().then((res) => res.data);
    iconIds.sort((a, b) => a - b);

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
});
