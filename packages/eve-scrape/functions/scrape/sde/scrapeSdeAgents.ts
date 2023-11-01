import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getCharactersCharacterId } from "@jitaspace/esi-client";
import {
  getAgentById,
  getAgentInSpaceById,
  getAllAgentIds,
  getAllAgentInSpaceIds,
} from "@jitaspace/sde-client";

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
    const agentCharacterIds = await getAllAgentIds().then((res) => res.data);
    agentCharacterIds.sort((a, b) => a - b);

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
        Promise.all(
          agentCharacterIds.map((characterId) =>
            limit(async () =>
              getAgentById(characterId)
                .then((res) => res.data)
                .then((agent) => ({
                  characterId: agent.characterID,
                  agentTypeId: agent.agentTypeID,
                  agentDivisionId: agent.divisionID,
                  isLocator: agent.isLocator,
                  level: agent.level,
                  stationId: agent.locationID,
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
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
