import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getUniverseBloodlines } from "@jitaspace/esi-client-kubb";

import { inngest } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeBloodlinesEventPayload = {
  data: {};
};

export const scrapeEsiBloodlines = inngest.createFunction(
  {
    name: "Scrape Bloodlines",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/bloodlines" },
  async ({ step }) => {
    const stepStartTime = performance.now();
    // FIXME: THIS SHOULD NOT BE NECESSARY
    axios.defaults.baseURL = "https://esi.evetech.net/latest";

    const limit = pLimit(20);

    // Get all Bloodlines in ESI
    const bloodlines = await getUniverseBloodlines();
    const bloodlineIds = bloodlines.map((bloodline) => bloodline.bloodline_id);

    const bloodlineChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.bloodline
          .findMany({
            where: {
              bloodlineId: {
                in: bloodlineIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        bloodlines.map((bloodline) => ({
          bloodlineId: bloodline.bloodline_id,
          corporationId: bloodline.corporation_id,
          name: bloodline.name,
          description: bloodline.description,
          shipTypeId: bloodline.ship_type_id,
          raceId: bloodline.race_id,
          charisma: bloodline.charisma,
          intelligence: bloodline.intelligence,
          memory: bloodline.memory,
          perception: bloodline.perception,
          willpower: bloodline.willpower,
          isDeleted: false,
        })),

      batchCreate: (entries) =>
        limit(() =>
          prisma.bloodline.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.bloodline.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            bloodlineId: {
              in: entries.map((entry) => entry.bloodlineId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.bloodline.update({
                data: entry,
                where: { bloodlineId: entry.bloodlineId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.bloodlineId,
    });

    // scrape the linked corporations
    await step.sendEvent({
      name: "scrape/esi/corporations",
      data: {
        corporationIds: [
          ...new Set(bloodlines.map((bloodline) => bloodline.corporation_id)),
        ],
      },
    });

    return {
      stats: {
        bloodlineChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);