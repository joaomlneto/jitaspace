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
// Imported from the module, not the helpers barrel: the barrel pulls in ESM-only
// deps that jest cannot load, and this job has unit tests.
import { ingestSdeCompositeTable } from "../../../helpers/ingestSdeCompositeTable";
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
 * nothing bootstrap AWAITS fills the NPC station set before the SDE ingest
 * loop. The full ESI station scrape is reached only as a fire-and-forget
 * `ctx.send("scrape-esi-stations")` from `scrape-esi-solar-systems`, so whether
 * it has landed by the time agents are written is a race; lose it and the write
 * fails with P2003 against the handful of corporation home stations
 * `createCorpAndItsRefRecords` seeded. `bootstrap-database` therefore sequences
 * this job INTO the FK-ordered SDE loop, after `ingest-sde-stations` (which it
 * does await) and before `ingest-sde-agents-in-space`. That still puts it after
 * every ESI scraper, since the whole loop runs after them.
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
    // They are the ~427 NPC corporation CEOs (also the only records missing
    // `locationID`), and they still need Character rows because a Corporation's
    // `ceoId` points at one — so only the Agent table is narrowed here.
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

    // ancestryId / isUnique come from npcCharacters.yaml, never from ESI, so the
    // ESI merge above cannot supply them (they are in SDE_OWNED_CHARACTER_COLUMNS).
    // Diff them separately, scoped to the NPC characters this run covers; this
    // pass only ever updates rows the merge above already created. Unlike the
    // SDE-owned tables below, this fetch must STAY scoped: Character is
    // ESI-owned and holds every character we have ever seen, so an unscoped
    // diff here would read millions of rows this file says nothing about.
    const characterSdeChanges = await updateTable({
      fetchLocalEntries: () =>
        prisma.character.findMany({
          where: { characterId: { in: agentCharacterIds } },
          select: { characterId: true, ancestryId: true, isUnique: true },
        }),
      fetchRemoteEntries: () =>
        Promise.resolve(
          npcCharacters.map(({ characterId, record }) => ({
            characterId,
            ancestryId: optionalNumber(record.ancestryID),
            isUnique: optionalBoolean(record.uniqueName),
          })),
        ),
      batchCreate: () => Promise.resolve(),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(() =>
              prisma.character.update({
                data: {
                  ancestryId: entry.ancestryId,
                  isUnique: entry.isUnique,
                },
                where: { characterId: entry.characterId },
              }),
            ),
          ),
        ),
      batchDelete: () => Promise.resolve(),
      idAccessor: (entry) => entry.characterId,
    });

    // Agent, ResearchAgent and ResearchAgentSkills are written by this job and
    // nothing else, so their local fetches are deliberately unscoped: the diff
    // only soft-deletes rows it fetched, and every id we could scope by comes
    // out of npcCharacters.yaml — so a character CCP deleted from the file has
    // no id to be scoped by, is never fetched, and is never soft-deleted. That
    // is how four Agent rows and one ResearchAgent row outlived the
    // npcCharacters.yaml entries CCP removed. Unscoped is cheap here: roughly
    // 11k / 244 / 780 live rows.
    const agentChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.agent
          .findMany()
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
    // Unscoped for the same reason as the Agent diff above — and it covers the
    // narrower case too: a research agent that is still in the file but no
    // longer carries agentTypeID 4 is local-not-in-remote and soft-deleted.
    const researchAgentsChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.researchAgent
          .findMany()
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
          .findMany()
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
          // By whole composite key, not by characterId: this table's row is
          // (character, skill), so deleting by character alone soft-deleted
          // every skill of any agent that lost even one of them. The survivors
          // came back as `modified` on the next run, so it self-healed and
          // stayed invisible — but between the two runs the agent's other
          // skills read as deleted. The table is ~780 rows, far under the bind
          // parameter cap an `OR` of pairs spends.
          where: {
            OR: entries.map(({ characterId, typeId }) => ({
              characterId,
              typeId,
            })),
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

    // `scopeIds` bounds the composite helper's local fetch exactly the way a
    // `where` bounds the fetches above, so it needs the same widening: on its
    // own, `agentCharacterIds` cannot name a character the SDE dropped. This
    // table is single-writer and small too, so add the characters it already
    // holds rows for — those are the ones whose rows have to be soft-deleted.
    const localSkillCharacterIds = await prisma.npcCharacterSkill
      .findMany({ select: { characterId: true }, distinct: ["characterId"] })
      .then((entries) => entries.map((entry) => entry.characterId));

    // npcCharacters.yaml `skills` covers 421 characters — 247 agents and 174
    // corporation CEOs. Keyed on Character so the CEOs' skills land too;
    // ResearchAgentSkills above only ever covers agentTypeID 4.
    const npcCharacterSkills = await ingestSdeCompositeTable({
      delegate: prisma.npcCharacterSkill,
      rows: npcCharacters.flatMap(({ characterId, record }) =>
        (record.skills ?? []).map((skill) => ({
          characterId,
          typeId: requiredNumber(skill.typeID),
          isDeleted: false,
        })),
      ),
      keyFields: ["characterId", "typeId"],
      scopeField: "characterId",
      scopeIds: [...new Set([...agentCharacterIds, ...localSkillCharacterIds])],
    });

    return {
      stats: {
        agentChanges,
        characterSdeChanges,
        npcCharacterSkills,
        characterChanges,
        researchAgentsChanges,
        researchAgentSkillChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
