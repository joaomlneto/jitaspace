import { cacheLife } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "~/lib/db";

/**
 * Read-only id lookups for the static EVE reference data that used to come from
 * the SDE HTTP API (`@jitaspace/sde-client`), now served straight out of our own
 * database.
 *
 * Most consumers of this data are server components, which read Prisma directly
 * and are cached with `use cache`. This route exists for the cases that can't
 * be: client components deep inside an interactive tree that only discover which
 * ids they need at render time (the /history diff labels, the market-group
 * breadcrumbs, an agent lookup keyed on a character id).
 *
 * The data changes at most once per SDE release, so every lookup is cached for a
 * day — the same "static, refreshed daily" behaviour the pages that embed this
 * data get from `cacheLife("days")`.
 */

/** A resource an id can be looked up in, and how to read one row of it. */
const resources = {
  type: (id: number) =>
    prisma.type.findUnique({
      select: { typeId: true, name: true, groupId: true, marketGroupId: true },
      where: { typeId: id },
    }),
  group: (id: number) =>
    prisma.group.findUnique({
      select: { groupId: true, name: true, categoryId: true },
      where: { groupId: id },
    }),
  category: (id: number) =>
    prisma.category.findUnique({
      select: { categoryId: true, name: true },
      where: { categoryId: id },
    }),
  "market-group": (id: number) =>
    prisma.marketGroup.findUnique({
      select: {
        marketGroupId: true,
        name: true,
        description: true,
        parentMarketGroupId: true,
        iconId: true,
      },
      where: { marketGroupId: id },
    }),
  race: (id: number) =>
    prisma.race.findUnique({
      select: { raceId: true, name: true },
      where: { raceId: id },
    }),
  faction: (id: number) =>
    prisma.faction.findUnique({
      select: { factionId: true, name: true },
      where: { factionId: id },
    }),
  "dogma-attribute": (id: number) =>
    prisma.dogmaAttribute.findUnique({
      select: {
        attributeId: true,
        name: true,
        displayName: true,
        unitId: true,
        iconId: true,
        highIsGood: true,
        attributeCategoryId: true,
      },
      where: { attributeId: id },
    }),
  "dogma-effect": (id: number) =>
    prisma.dogmaEffect.findUnique({
      select: { effectId: true, name: true, displayName: true },
      where: { effectId: id },
    }),
  "dogma-unit": (id: number) =>
    prisma.dogmaUnit.findUnique({
      select: { unitId: true, name: true, displayName: true },
      where: { unitId: id },
    }),
  "dogma-attribute-category": (id: number) =>
    prisma.dogmaAttributeCategory.findUnique({
      select: { attributeCategoryId: true, name: true, description: true },
      where: { attributeCategoryId: id },
    }),
  // Keyed on a character id. A 404 here is the answer to "is this character an
  // agent?", which is why `useCharacter` no longer has to pull the full list of
  // NPC character ids just to make that call.
  agent: async (id: number) => {
    const agent = await prisma.agent.findUnique({
      select: {
        characterId: true,
        agentTypeId: true,
        agentDivisionId: true,
        isLocator: true,
        level: true,
        stationId: true,
        AgentDivision: { select: { name: true } },
        Character: { select: { corporationId: true } },
        agentsInSpace: {
          select: {
            dungeonId: true,
            solarSystemId: true,
            spawnPointId: true,
            typeId: true,
          },
        },
      },
      where: { characterId: id },
    });
    if (!agent) return null;

    const researchAgent = await prisma.researchAgent.findUnique({
      select: { skills: { select: { typeId: true } } },
      where: { characterId: id },
    });

    const { AgentDivision, Character, agentsInSpace, ...rest } = agent;
    return {
      ...rest,
      corporationId: Character.corporationId,
      agentDivisionName: AgentDivision.name,
      isResearchAgent: researchAgent !== null,
      researchSkills: (researchAgent?.skills ?? []).map(
        (skill) => skill.typeId,
      ),
      // `agentsInSpace` is a to-many relation on a 1:1 pairing, so at most one
      // row is ever present.
      agentInSpace: agentsInSpace[0] ?? null,
    };
  },
} as const;

export type SdeResource = keyof typeof resources;

function isSdeResource(value: string): value is SdeResource {
  return Object.hasOwn(resources, value);
}

/**
 * The cached read. `cacheComponents` rejects the `revalidate` route-segment
 * export, so the caching lives here instead — keyed on the two (serializable)
 * arguments, which is exactly the cache granularity we want.
 */
async function readSdeRecord(resource: SdeResource, id: number) {
  "use cache";
  cacheLife("days");

  return await resources[resource](id);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  const { resource, id } = await params;

  if (!isSdeResource(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const record = await readSdeRecord(resource, numericId);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(record, {
    headers: {
      // Static reference data: let the CDN and browser hold it for a day too,
      // and keep serving the old copy while a new one is fetched.
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
