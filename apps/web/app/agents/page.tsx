import { notFound } from "next/navigation";
import { Container, Group, Stack, Title } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { AgentFinderIcon } from "@jitaspace/eve-icons";
import { removeUndefinedFields } from "@jitaspace/utils";

import { AgentsTable } from "~/components/Agents";

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

export const revalidate = 86400;

export default async function Page() {
  let agents: PageProps["agents"] = [];
  let agentTypes: PageProps["agentTypes"] = [];
  let agentDivisions: PageProps["agentDivisions"] = [];
  try {
    agents = await prisma.agent
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

    agents.forEach(removeUndefinedFields);
    agents = agents.sort((a, b) => a.name.localeCompare(b.name));

    agentTypes = await prisma.agentType.findMany({
      select: {
        agentTypeId: true,
        name: true,
      },
    });

    agentDivisions = await prisma.npcCorporationDivision.findMany({
      select: {
        npcCorporationDivisionId: true,
        name: true,
      },
    });
  } catch {
    notFound();
  }
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
