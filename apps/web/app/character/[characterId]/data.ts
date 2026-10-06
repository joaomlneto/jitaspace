import { cache } from "react";

import type { AgentDetails, CharacterRecord, NamedRef } from "./types";
import { prisma } from "~/lib/db";
import { cacheSdeRead } from "~/lib/sdeCache";

const ref = (
  id: number | null | undefined,
  name: string | null | undefined,
): NamedRef | null => (id == null ? null : { id, name: name ?? null });

const byName = (a: NamedRef, b: NamedRef) =>
  (a.name ?? "").localeCompare(b.name ?? "");

function findCharacter(characterId: number) {
  return prisma.character.findUnique({
    select: {
      name: true,
      corporationId: true,
      corporation: { select: { name: true } },
      raceId: true,
      race: { select: { name: true } },
      bloodlineId: true,
      bloodline: { select: { name: true } },
      ancestryId: true,
      factionId: true,
      faction: { select: { name: true } },
      gender: true,
      title: true,
      description: true,
      securityStatus: true,
      isUnique: true,
      CorporationCeo: {
        select: { corporationId: true, name: true },
        where: { isDeleted: false },
      },
      createdCorporations: {
        select: { corporationId: true, name: true },
        where: { isDeleted: false },
      },
      Agent: {
        select: {
          agentTypeId: true,
          AgentType: { select: { name: true } },
          agentDivisionId: true,
          AgentDivision: { select: { name: true, displayName: true } },
          level: true,
          isLocator: true,
          isCeo: true,
          startDate: true,
          station: {
            select: {
              stationId: true,
              name: true,
              solarSystem: {
                select: {
                  solarSystemId: true,
                  name: true,
                  securityStatus: true,
                  constellation: {
                    select: {
                      regionId: true,
                      region: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
          agentsInSpace: {
            select: {
              dungeonId: true,
              solarSystemId: true,
              solarSystem: { select: { name: true } },
              typeId: true,
              type: { select: { name: true } },
            },
            take: 1,
          },
        },
      },
      researchAgents: {
        select: {
          skills: {
            select: { typeId: true, skill: { select: { name: true } } },
            where: { isDeleted: false },
          },
        },
      },
    },
    where: { characterId },
  });
}

type CharacterRow = NonNullable<Awaited<ReturnType<typeof findCharacter>>>;

async function toAgentDetails(row: CharacterRow): Promise<AgentDetails | null> {
  const agent = row.Agent;
  if (!agent) return null;
  const inSpace = agent.agentsInSpace[0];
  const dungeon = inSpace
    ? await prisma.dungeon.findUnique({
        select: { name: true },
        where: { dungeonId: inSpace.dungeonId },
      })
    : null;
  const system = agent.station.solarSystem;
  return {
    agentType: { id: agent.agentTypeId, name: agent.AgentType.name },
    division: {
      id: agent.agentDivisionId,
      name: agent.AgentDivision.displayName ?? agent.AgentDivision.name,
    },
    level: agent.level,
    isLocator: agent.isLocator,
    isCeo: agent.isCeo,
    startDate: agent.startDate?.toISOString() ?? null,
    station: {
      stationId: agent.station.stationId,
      name: agent.station.name,
      solarSystemId: system?.solarSystemId ?? null,
      solarSystemName: system?.name ?? null,
      securityStatus: system?.securityStatus.toNumber() ?? null,
      regionId: system?.constellation.regionId ?? null,
      regionName: system?.constellation.region?.name ?? null,
    },
    inSpace: inSpace
      ? {
          dungeon: { id: inSpace.dungeonId, name: dungeon?.name ?? null },
          solarSystem: {
            id: inSpace.solarSystemId,
            name: inSpace.solarSystem.name,
          },
          type: { id: inSpace.typeId, name: inSpace.type.name },
        }
      : null,
    researchSkills: row.researchAgents
      .flatMap((research) => research.skills)
      .map((skill) => ({ id: skill.typeId, name: skill.skill.name }))
      .sort(byName),
  };
}

/**
 * What our database knows about a character, or `null` when it has no row,
 * which is most players: the table holds the SDE's NPC characters and the
 * players our scrapes met (corporation CEOs and founders).
 *
 * The rows are SDE data or change rarely, so the read is cached until the next
 * SDE ingest. Nothing here catches: a database failure throws, and the
 * uncached caller degrades, so a blip is never what gets cached.
 */
export async function readCharacterRecord(
  characterId: number,
): Promise<CharacterRecord | null> {
  "use cache";
  cacheSdeRead();

  const row = await findCharacter(characterId);
  if (row === null) return null;

  const [agent, ancestry] = await Promise.all([
    toAgentDetails(row),
    row.ancestryId == null
      ? null
      : prisma.ancestry.findUnique({
          select: { name: true },
          where: { ancestryId: row.ancestryId },
        }),
  ]);

  return {
    name: row.name,
    corporation: { id: row.corporationId, name: row.corporation.name },
    race: { id: row.raceId, name: row.race.name },
    bloodline: { id: row.bloodlineId, name: row.bloodline.name },
    ancestry: ref(row.ancestryId, ancestry?.name),
    faction: ref(row.factionId, row.faction?.name),
    gender: row.gender,
    title: row.title,
    description: row.description,
    securityStatus: row.securityStatus,
    isUnique: row.isUnique,
    agent,
    ceoOf: row.CorporationCeo.map((c) => ({
      id: c.corporationId,
      name: c.name,
    })).sort(byName),
    founded: row.createdCorporations
      .map((c) => ({ id: c.corporationId, name: c.name }))
      .sort(byName),
  };
}

/** What the page gets from {@link loadCharacterRecord}. */
export type CharacterRecordResult =
  | { ok: true; record: CharacterRecord | null }
  | { ok: false };

/**
 * The page renders from ESI without this half, so a database failure degrades
 * to the ESI-only page. `ok: false` lets the caller keep that degraded render
 * out of the ISR cache; `cache()` gives the page one attempt per request.
 */
export const loadCharacterRecord = cache(
  async (characterId: number): Promise<CharacterRecordResult> => {
    try {
      return { ok: true, record: await readCharacterRecord(characterId) };
    } catch {
      return { ok: false };
    }
  },
);
