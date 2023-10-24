import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getCharactersCharacterId } from "@jitaspace/esi-client";
import { getAgentById, getAllAgentIds } from "@jitaspace/sde-client";

import { client } from "../../../client";
import { mergeEsiEntriesIntoCharactersTable } from "../../../helpers";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeAgentsEventPayload = {
  data: {
    batchSize?: number;
  };
};

export const scrapeSdeAgents = client.createFunction(
  {
    id: "scrape-sde-agents",
    name: "Scrape Agents",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/sde/agents" },
  async ({ step, event, logger }) => {
    const stepStartTime = performance.now();
    const limit = pLimit(20);

    // Get all Agent IDs in SDE
    const characterIds = await getAllAgentIds().then((res) => res.data);
    characterIds.sort((a, b) => a - b);

    const characters = await Promise.all(
      characterIds.map((characterId) =>
        limit(async () =>
          getCharactersCharacterId(characterId).then((res) => ({
            characterId,
            ...res.data,
          })),
        ),
      ),
    );

    const characterChanges =
      await mergeEsiEntriesIntoCharactersTable(characters);

    const agentChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.agent
          .findMany({
            where: {
              characterId: {
                in: characterIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          characterIds.map((characterId) =>
            limit(async () =>
              getAgentById(characterId)
                .then((res) => res.data)
                .then((agent) => ({
                  characterId: agent.characterID,
                  agentTypeId: agent.agentTypeID,
                  agentDivisionId: agent.divisionID,
                  isLocator: agent.isLocator,
                  level: agent.level,
                  location: agent.locationID,
                  isDeleted: false,
                })),
            ),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.agent.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.agent.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            characterId: {
              in: entries.map((entry) => entry.characterId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.agent.update({
                data: entry,
                where: { characterId: entry.characterId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.characterId,
    });

    return {
      stats: {
        agentChanges,
        characterChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
