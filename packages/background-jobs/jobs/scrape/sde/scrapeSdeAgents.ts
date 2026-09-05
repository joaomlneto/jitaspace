import pLimit from "p-limit";

import { getCharactersDetail } from "@jitaspace/esi-client";

import type { SdeNpcCharacterRecord } from "../../../helpers/agents.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  loadSdeFile,
  mergeEsiEntriesIntoCharactersTable,
  optionalBoolean,
  optionalNumber,
  optionalSdeDate,
  requiredNumber,
} from "../../../helpers";
import { hasAgentData, isResearchAgent } from "../../../helpers/agents.ts";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeAgentsEventPayload {
  data: {
    batchSize?: number;
  };
}

/**
 * Agent metadata comes from the SDE archive (`npcCharacters.yaml`), but the
 * Character rows it hangs off come from ESI — so unlike the pure `ingest-sde-*`
 * jobs this one is a hybrid and keeps its `scrape-` id.
 *
 * `Agent` references Character and Station, so ordering is load-bearing.
 * Characters this job needs are created by its own `createCorpAndItsRefRecords`
 * call below, but `Agent.stationId` is a non-nullable FK into Station and
 * nothing before the SDE ingest loop fills the NPC station set — bootstrap does
 * not invoke `scrape-esi-stations`, so until `ingest-sde-stations` runs the
 * table holds only the handful of corporation home stations and writing agents
 * fails with P2003. `bootstrap-database` therefore sequences this job INTO the
 * FK-ordered SDE loop, after `ingest-sde-stations` and before
 * `ingest-sde-agents-in-space`; that still puts it after every ESI scraper,
 * since the whole loop runs after them.
 *
 * AgentInSpace is deliberately not written here — `ingest-sde-agents-in-space`
 * owns that table from `agentsInSpace.yaml`.
 */
export const scrapeSdeAgents = defineJob<ScrapeAgentsEventPayload["data"]>({
  id: "scrape-sde-agents",
  name: "Scrape Agents",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  // This job now downloads and extracts the SDE archive on top of its per-agent
  // ESI fan-out, so it gets the same ceiling as the `ingest-sde-*` jobs rather
  // than the default.
  maxDurationSeconds: 1800,
  handler: async () => {
    const stepStartTime = performance.now();
    const limit = pLimit(20);

    // `npcCharacters.yaml` is an `addId` file, but the map key is the id we need
    // and matches the SDE-API id list this job used to page through.
    const npcCharacterRecords = await loadSdeFile("npcCharacters.yaml");
    const npcCharacters = Object.entries(npcCharacterRecords)
      .map(([key, record]) => ({
        characterId: Number(key),
        record: record as SdeNpcCharacterRecord,
      }))
      .sort((a, b) => a.characterId - b.characterId);
    const agentCharacterIds = npcCharacters.map((entry) => entry.characterId);
    // Not every NPC character is an agent — the SDE omits the whole `agent`
    // block on the ones that are not, and the required-field guard below reads
    // a missing container as corrupt data and throws. Drop them here instead.
    // `agentCharacterIds` deliberately stays the FULL list: it scopes the
    // soft-delete, so a character that LOSES its agent block still has its
    // existing row marked deleted rather than being silently orphaned.
    const agentRecords = npcCharacters.filter(({ record }) =>
      hasAgentData(record),
    );

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
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () =>
        Promise.resolve(
          agentRecords.map(({ characterId, record }) => {
            const agentTypeId = optionalNumber(record.agent?.agentTypeID);
            const agentDivisionId = optionalNumber(record.agent?.divisionID);
            const level = optionalNumber(record.agent?.level);
            if (
              agentTypeId === null ||
              agentDivisionId === null ||
              level === null
            ) {
              throw new Error(
                `Agent ${characterId} is missing required SDE fields (agentTypeID/divisionID/level)`,
              );
            }
            return {
              characterId,
              agentTypeId,
              agentDivisionId,
              isLocator: Boolean(record.agent?.isLocator ?? false),
              level,
              stationId: requiredNumber(record.locationID),
              // SDE-only fields the archive omits on a minority of NPC
              // characters, so each lands as null rather than undefined.
              isCeo: optionalBoolean(record.ceo),
              startDate: optionalSdeDate(record.startDate),
              careerId: optionalNumber(record.careerID),
              schoolId: optionalNumber(record.schoolID),
              specialityId: optionalNumber(record.specialityID),
              isDeleted: false,
            };
          }),
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

    const researchAgentCharacters = npcCharacters.filter((entry) =>
      isResearchAgent(entry.record),
    );
    const researchAgentCharacterIds = researchAgentCharacters.map(
      (entry) => entry.characterId,
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
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () =>
        Promise.resolve(
          researchAgentCharacters.map(({ characterId }) => ({
            characterId,
            isDeleted: false,
          })),
        ),
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
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () =>
        Promise.resolve(
          researchAgentCharacters.flatMap(({ characterId, record }) =>
            (record.skills ?? []).map((skill) => ({
              characterId,
              typeId: requiredNumber(skill.typeID),
              isDeleted: false,
            })),
          ),
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
