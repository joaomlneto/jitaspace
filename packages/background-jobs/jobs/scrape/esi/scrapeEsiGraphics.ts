import pLimit from "p-limit";

import {
  getUniverseGraphics,
  getUniverseGraphicsGraphicId,
} from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeGraphicsEventPayload {
  data: {};
}

type Limit = ReturnType<typeof pLimit>;

const fetchRemoteGraphic = (limit: Limit, graphicId: number) =>
  limit(() =>
    getUniverseGraphicsGraphicId(graphicId)
      .then((res) => res.data)
      .then((graphic) => ({
        graphicId: graphic.graphic_id,
        graphicFile: graphic.graphic_file ?? null,
        collisionFile: graphic.collision_file ?? null,
        iconFolder: graphic.icon_folder ?? null,
        sofDna: graphic.sof_dna ?? null,
        sofHullName: graphic.sof_hull_name ?? null,
        sofRaceName: graphic.sof_race_name ?? null,
        sofFactionName: graphic.sof_fation_name ?? null,
        isDeleted: false,
      })),
  );

export const scrapeEsiGraphics = defineJob<ScrapeGraphicsEventPayload["data"]>({
  id: "scrape-esi-graphics",
  name: "Scrape Graphics",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();

    // Get all Graphic IDs in ESI
    const graphicIds = await getUniverseGraphics().then((res) => res.data);
    graphicIds.sort((a, b) => a - b);

    const limit = pLimit(20);

    const graphicChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.graphic
          .findMany({
            where: {
              graphicId: {
                in: graphicIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          graphicIds.map((graphicId) => fetchRemoteGraphic(limit, graphicId)),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.graphic.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.graphic.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            graphicId: {
              in: entries.map((entry) => entry.graphicId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.graphic.update({
                data: entry,
                where: { graphicId: entry.graphicId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.graphicId,
    });

    return {
      graphicChanges,
      elapsed: performance.now() - stepStartTime,
    };
  },
});
