import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getCharactersCharacterId } from "@jitaspace/esi-client";
import {
  getAllResearchAgentIds,
  getResearchAgentById,
} from "@jitaspace/sde-client";

import { client } from "../../../client";
import { mergeEsiEntriesIntoCharactersTable } from "../../../helpers";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeResearchAgentsEventPayload = {
  data: {
    batchSize?: number;
  };
};

export const scrapeSdeResearchAgents = client.createFunction(
  {
    id: "scrape-sde-research-agents",
    name: "Scrape Research Agents",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/sde/research-agents" },
  async ({ step, event, logger }) => {
    const stepStartTime = performance.now();
    const limit = pLimit(20);

    // get IDs of research agents
    const researchAgentCharacterIds = await getAllResearchAgentIds().then(
      (res) => res.data,
    );
    researchAgentCharacterIds.sort((a, b) => a - b);

    const characters = await Promise.all(
      researchAgentCharacterIds.map((characterId) =>
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

    const sdeResearchAgents = await Promise.all(
      researchAgentCharacterIds.map((characterId) =>
        limit(async () =>
          getResearchAgentById(characterId).then((res) => res.data),
        ),
      ),
    );

    const researchAgentsChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.researchAgent
          .findMany({
            where: {
              characterId: {
                in: researchAgentCharacterIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        sdeResearchAgents.map((agent) => ({
          characterId: agent.characterID,
          isDeleted: false,
        })),
      batchCreate: (entries) =>
        limit(() =>
          prisma.researchAgent.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.researchAgent.updateMany({
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
              prisma.researchAgent.update({
                data: entry,
                where: { characterId: entry.characterId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.characterId,
    });

    const researchAgentSkillChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.researchAgentSkills
          .findMany({
            where: {
              characterId: {
                in: researchAgentCharacterIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        sdeResearchAgents.flatMap((agent) =>
          agent.skills.flatMap((typeId) => ({
            characterId: agent.characterID,
            typeId: typeId.typeID,
            isDeleted: false,
          })),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.researchAgentSkills.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.researchAgentSkills.updateMany({
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
              prisma.researchAgentSkills.update({
                data: entry,
                where: {
                  characterId_typeId: {
                    characterId: entry.characterId,
                    typeId: entry.typeId,
                  },
                },
              }),
            ),
          ),
        ),
      idAccessor: (e) => `${e.characterId}:${e.typeId}`,
    });

    await step.sendEvent("Function Finished", {
      name: "scrape/sde/research-agents.finished",
      data: {},
    });

    return {
      stats: {
        characterChanges,
        researchAgentsChanges,
        researchAgentSkillChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
