import { cacheLife } from "next/cache";
import { Container, Group, Stack, Title } from "@mantine/core";

import { AgentFinderIcon } from "@jitaspace/eve-icons";
import { removeUndefinedFields } from "@jitaspace/utils";

import { AgentsTable } from "~/components/Agents";
import { prisma } from "~/lib/db";

export const metadata = {
  title: "Agents",
  description: "Browse EVE Online NPC agents and their locations.",
};

interface PageProps {
  agents: {
    characterId: number;
    name: string;
    corporationId: number;
    agentTypeId: number;
    agentDivisionId: number;
    isLocator: boolean;
    level: number;
    stationId: number;
  }[];
  agentTypes: { name: string; agentTypeId: number }[];
  agentDivisions: { name: string; npcCorporationDivisionId: number }[];
}

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. Throwing writes nothing to the cache, so
  // the route recovers as soon as the database does. See CLAUDE.md → "Never
  // catch a database error inside a `"use cache"` scope".
  const agents: PageProps["agents"] = await prisma.agent
    .findMany({
      select: {
        characterId: true,
        Character: {
          select: {
            name: true,
            corporation: {
              select: {
                corporationId: true,
              },
            },
          },
        },
        agentTypeId: true,
        agentDivisionId: true,
        isLocator: true,
        level: true,
        stationId: true,
      },
    })
    .then((agents) =>
      agents.map((agent) => ({
        characterId: agent.characterId,
        name: agent.Character.name,
        corporationId: agent.Character.corporation.corporationId,
        agentTypeId: agent.agentTypeId,
        agentDivisionId: agent.agentDivisionId,
        isLocator: agent.isLocator,
        level: agent.level,
        stationId: agent.stationId,
      })),
    );

  agents.forEach((agent) => removeUndefinedFields(agent));
  agents.sort((a, b) => a.name.localeCompare(b.name));

  const agentTypes: PageProps["agentTypes"] = await prisma.agentType.findMany({
    select: {
      agentTypeId: true,
      name: true,
    },
  });

  const agentDivisions: PageProps["agentDivisions"] =
    await prisma.npcCorporationDivision.findMany({
      select: {
        npcCorporationDivisionId: true,
        name: true,
      },
    });
  return (
    <Container size="xl">
      <Stack>
        <Group>
          <AgentFinderIcon width={48} />
          <Title>Agents</Title>
        </Group>
        <AgentsTable
          agents={agents}
          agentTypes={agentTypes}
          agentDivisions={agentDivisions}
        />
      </Stack>
    </Container>
  );
}
