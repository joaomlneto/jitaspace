import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getUniverseGraphics,
  getUniverseGraphicsGraphicId,
} from "@jitaspace/esi-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeGraphicsEventPayload = {
  data: {};
};

export const scrapeEsiGraphics = client.createFunction(
  {
    id: "scrape-esi-graphics",
    name: "Scrape Graphics",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/graphics" },
  async ({}) => {
    const stepStartTime = performance.now();
    // FIXME: THIS SHOULD NOT BE NECESSARY
    axios.defaults.baseURL = "https://esi.evetech.net/latest";

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
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          graphicIds.map((graphicId) =>
            limit(async () =>
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
            ),
          ),
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
);
