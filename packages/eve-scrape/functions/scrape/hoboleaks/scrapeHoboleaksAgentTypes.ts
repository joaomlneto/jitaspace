import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeAgentTypesEventPayload = {
  data: {};
};

export const scrapeHoboleaksAgentTypes = client.createFunction(
  {
    id: "scrape-hoboleaks-agent-types",
    name: "Scrape Agent Types",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/hoboleaks/agent-types" },
  async ({}) => {
    const stepStartTime = performance.now();

    // Get all Agent Types in Hoboleaks
    const agentTypes: Record<number, string> = await fetch(
      "https://sde.hoboleaks.space/tq/agenttypes.json",
    ).then((res) => res.json());

    const agentTypeIds = Object.keys(agentTypes).map((k) => Number(k));

    const limit = pLimit(20);

    const agentTypeChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.agentType
          .findMany({
            where: {
              agentTypeId: {
                in: agentTypeIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Object.entries(agentTypes).map(([agentTypeId, name]) => ({
          agentTypeId: Number(agentTypeId),
          name,
          isDeleted: false,
        })),
      batchCreate: (entries) =>
        limit(() =>
          prisma.agentType.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.agentType.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            agentTypeId: {
              in: entries.map((entry) => entry.agentTypeId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.agentType.update({
                data: entry,
                where: { agentTypeId: entry.agentTypeId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.agentTypeId,
    });

    return {
      stats: {
        agentTypeChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
