import pLimit from "p-limit";

import { getCharactersDetail } from "@jitaspace/esi-client";

import type { Prisma } from "../../../db";
import type { SdeNpcCharacter } from "../../../helpers/agents.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFile,
  mergeEsiEntriesIntoCharactersTable,
} from "../../../helpers";
import { isResearchAgent } from "../../../helpers/agents.ts";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";

export interface ScrapeAgentsEventPayload {
  data: {
    batchSize?: number;
  };
}

/**
 * Agents, from npcCharacters.yaml in the SDE archive plus ESI for the character
 * records they hang off.
 *
 * npcCharacters.yaml lists every NPC character; only those with an `agent` block
 * are agents, so that block is the filter for every table written here. The
 * Agent / ResearchAgent / ResearchAgentSkills rows come straight from the SDE,
 * but `Agent.characterId` is a foreign key into `Character` — an ESI-owned
 * table — so the ESI character details still have to be fetched and merged
 * first. (Agents *in space* are a separate file and belong to
 * `ingest-sde-agents-in-space`.)
 *
 * That ESI dependency is why this stays a `scrape-*` job outside the
 * `ingest-sde-all` pipeline, which is deliberately SDE-only.
 */
export const scrapeSdeAgents = defineJob<ScrapeAgentsEventPayload["data"]>({
  id: "scrape-sde-agents",
  name: "Scrape Agents",
  description:
    "Ingest agents from the SDE's npcCharacters.yaml, backfilling their Character rows from ESI.",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  maxDurationSeconds: 1800,
  handler: async () => {
    const stepStartTime = performance.now();
    const limit = pLimit(20);

    const npcCharacters = await loadSdeFile("npcCharacters.yaml");
    const agents = Object.entries(npcCharacters)
      .map(([key, record]) => ({
        characterId: Number(key),
        record: record as SdeNpcCharacter,
      }))
      .filter(({ record }) => record.agent !== undefined)
      .sort((a, b) => a.characterId - b.characterId);

    const agentCharacterIds = agents.map((agent) => agent.characterId);

    await createCorpAndItsRefRecords({
      missingCharacterIds: new Set(agentCharacterIds),
    });

    const characters = await Promise.all(
      agentCharacterIds.map((characterId) =>
        limit(async () =>
          getCharactersDetail(characterId).then((res) => ({
            characterId,
            ...res.data,
          })),
        ),
      ),
    );

    const characterChanges =
      await mergeEsiEntriesIntoCharactersTable(characters);

    const agentChanges = await ingestSdeTable({
      filename: "npcCharacters.yaml",
      idField: "characterId",
      delegate: prisma.agent,
      records: Object.fromEntries(
        agents.map(({ characterId, record }) => [characterId, record]),
      ),
      toRow: (record, id): Prisma.AgentCreateManyInput => {
        const { agent, locationID } = record as unknown as SdeNpcCharacter;
        const { agentTypeID, divisionID, level } = agent ?? {};
        if (
          agentTypeID === undefined ||
          divisionID === undefined ||
          level === undefined
        ) {
          throw new Error(
            `Agent ${id} is missing required SDE fields (agentTypeID/divisionID/level)`,
          );
        }
        return {
          characterId: id,
          agentTypeId: agentTypeID,
          agentDivisionId: divisionID,
          isLocator: agent?.isLocator ?? false,
          level,
          stationId: locationID,
          isDeleted: false,
        };
      },
    });

    const researchAgents = agents.filter(({ record }) =>
      isResearchAgent(record),
    );
    const researchAgentCharacterIds = researchAgents.map(
      (agent) => agent.characterId,
    );

    const researchAgentsChanges = await ingestSdeTable({
      filename: "npcCharacters.yaml",
      idField: "characterId",
      delegate: prisma.researchAgent,
      records: Object.fromEntries(
        researchAgents.map(({ characterId, record }) => [characterId, record]),
      ),
      toRow: (_record, id): Prisma.ResearchAgentCreateManyInput => ({
        characterId: id,
        isDeleted: false,
      }),
    });

    const researchAgentSkillChanges = await ingestSdeCompositeTable({
      delegate: prisma.researchAgentSkills,
      rows: researchAgents.flatMap(({ characterId, record }) =>
        (record.skills ?? []).map((skill) => ({
          characterId,
          typeId: skill.typeID,
          isDeleted: false,
        })),
      ),
      keyFields: ["characterId", "typeId"],
      scopeField: "characterId",
      scopeIds: researchAgentCharacterIds,
    });

    return {
      stats: {
        agentChanges,
        characterChanges,
        researchAgentsChanges,
        researchAgentSkillChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
