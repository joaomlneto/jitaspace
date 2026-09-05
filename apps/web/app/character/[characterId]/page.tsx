import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import type { CharacterAgentData } from "@jitaspace/hooks";
import {
  getAlliancesAllianceId,
  getCharactersDetail,
  getCorporationsCorporationId,
} from "@jitaspace/esi-client";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { eveImage, pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

/** Resolves a name, or nothing — an unfurl is never worth failing a page over. */
async function nameOf<T extends { data: { name: string } }>(
  fetcher: () => Promise<T>,
): Promise<string | undefined> {
  try {
    return (await fetcher()).data.name;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ characterId: string }>;
}): Promise<Metadata> {
  const { characterId } = await params;
  const id = parsePositiveEntityId(characterId);
  if (id === null) return {};
  try {
    const character = (await getCharactersDetail(id)).data;

    // Affiliations are the interesting part of a shared character link, and
    // they're two independent lookups — run them together.
    const allianceId = character.alliance_id;
    const [corporation, alliance] = await Promise.all([
      nameOf(() => getCorporationsCorporationId(character.corporation_id)),
      allianceId ? nameOf(() => getAlliancesAllianceId(allianceId)) : undefined,
    ]);

    const flyingWith = corporation ? ` flying with ${corporation}` : "";
    const inAlliance = alliance ? ` (${alliance})` : "";

    return pageMetadata({
      title: character.name,
      description: `${character.name} is an EVE Online capsuleer${flyingWith}${inAlliance}. View their corporation history, affiliations, and public record.`,
      path: `/character/${id}`,
      badge: "Character",
      image: eveImage.character(id),
      facts: [
        ...(corporation ? [{ label: "Corporation", value: corporation }] : []),
        ...(alliance ? [{ label: "Alliance", value: alliance }] : []),
      ],
    });
  } catch {
    return {};
  }
}

/** Agent type 4 is the research agent that offers datacore research. */
const RESEARCH_AGENT_TYPE_ID = 4;

/**
 * The SDE half of a character: its agent record, if it has one. Only the SDE
 * knows this, so it is read from our own database here and handed to the client
 * page, which feeds it into `useCharacter` alongside the ESI half.
 *
 * Returns null for players (the overwhelming majority) and on error, which is
 * what `useCharacter` treats as "not an agent".
 */
async function getCharacterAgentData(
  characterId: number,
): Promise<(CharacterAgentData & { divisionName: string | null }) | null> {
  try {
    const agent = await prisma.agent.findUnique({
      select: {
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
          take: 1,
        },
      },
      where: { characterId },
    });
    if (!agent) return null;

    const researchSkills =
      agent.agentTypeId === RESEARCH_AGENT_TYPE_ID
        ? await prisma.researchAgentSkills
            .findMany({
              select: { typeId: true },
              where: { characterId },
            })
            .then((rows) => rows.map((row) => row.typeId))
        : [];

    const inSpace = agent.agentsInSpace[0] ?? null;

    return {
      agentTypeId: agent.agentTypeId,
      agentDivisionId: agent.agentDivisionId,
      corporationId: agent.Character.corporationId,
      isLocator: agent.isLocator,
      level: agent.level,
      locationId: agent.stationId,
      isResearchAgent: agent.agentTypeId === RESEARCH_AGENT_TYPE_ID,
      researchSkills,
      inSpace,
      divisionName: agent.AgentDivision.name,
    };
  } catch {
    return null;
  }
}

/**
 * The database read lives here rather than in `Page` so it happens *inside* the
 * Suspense boundary. Awaiting it in `Page` would put uncached data outside the
 * boundary, which blocks the whole route from prerendering.
 */
async function PageContent({
  params,
}: Readonly<{ params: Promise<{ characterId: string }> }>) {
  const { characterId } = await params;
  const id = parsePositiveEntityId(characterId);
  if (id === null) notFound();
  const agent = await getCharacterAgentData(id);

  return (
    <PageClient
      agentData={agent}
      agentDivisionName={agent?.divisionName ?? null}
    />
  );
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ characterId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
