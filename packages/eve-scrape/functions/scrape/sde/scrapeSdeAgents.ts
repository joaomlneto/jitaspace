import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getCharactersCharacterId } from "@jitaspace/esi-client";
import {
  getAgentInSpaceById,
  getAllAgentInSpaceIds,
  getAllNpcCharacterIds,
  getNpcCharacterById,
} from "@jitaspace/sde-client";

import { client } from "../../../client";
import { mergeEsiEntriesIntoCharactersTable } from "../../../helpers";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
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

    // Get all NPC Character IDs in SDE
    const agentCharacterIds = await getAllNpcCharacterIds().then(
      (res) => res.data,
    );
    agentCharacterIds.sort((a, b) => a - b);

    await createCorpAndItsRefRecords({
      missingCharacterIds: new Set(agentCharacterIds),
    });

    const characters = await Promise.all(
      agentCharacterIds.map((characterId) =>
        limit(async () =>
          getCharactersCharacterId(characterId).then((res) => ({
            characterId,
            ...res.data,
          })),
        ),
      ),
    );

    // get IDs of agents in space
    const agentsInSpaceCharacterIds = await getAllAgentInSpaceIds().then(
      (res) => res.data,
    );
    agentsInSpaceCharacterIds.sort((a, b) => a - b);

    const characterChanges =
      await mergeEsiEntriesIntoCharactersTable(characters);

    const npcCharacters = await Promise.all(
      agentCharacterIds.map((characterId) =>
        limit(async () =>
          getNpcCharacterById(characterId).then((res) => res.data),
        ),
      ),
    );

    const agentChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.agent
          .findMany({
            where: {
              characterId: {
                in: agentCharacterIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        npcCharacters.map((npcCharacter) => ({
          characterId: npcCharacter.characterID,
          agentTypeId: npcCharacter.agent.agentTypeID!,
          agentDivisionId: npcCharacter.agent.divisionID!,
          isLocator: npcCharacter.agent.isLocator ?? false,
          level: npcCharacter.agent.level!,
          stationId: npcCharacter.locationID,
          isDeleted: false,
        })),
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

    const researchAgentCharacters = npcCharacters.filter(
      (npcCharacter) => npcCharacter.skills.length > 0,
    );
    const researchAgentCharacterIds = researchAgentCharacters.map(
      (npcCharacter) => npcCharacter.characterID,
    );
    researchAgentCharacterIds.sort((a, b) => a - b);

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
        researchAgentCharacters.map((agent) => ({
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
        researchAgentCharacters.flatMap((agent) =>
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

    const agentsInSpaceChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.agentInSpace
          .findMany({
            where: {
              characterId: {
                in: agentsInSpaceCharacterIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          agentsInSpaceCharacterIds.map((characterId) =>
            limit(async () =>
              getAgentInSpaceById(characterId)
                .then((res) => res.data)
                .then((agent) => ({
                  characterId: agent.characterID,
                  dungeonId: agent.dungeonID,
                  solarSystemId: agent.solarSystemID,
                  spawnPointId: agent.spawnPointID,
                  typeId: agent.typeID,
                  isDeleted: false,
                })),
            ),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.agentInSpace.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.agentInSpace.updateMany({
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
              prisma.agentInSpace.update({
                data: entry,
                where: { characterId: entry.characterId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.characterId,
    });

    await step.sendEvent("Function Finished", {
      name: "scrape/sde/agents.finished",
      data: {},
    });

    return {
      stats: {
        agentChanges,
        agentsInSpaceChanges,
        characterChanges,
        researchAgentsChanges,
        researchAgentSkillChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
