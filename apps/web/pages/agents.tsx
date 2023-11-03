import React, { type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, Group, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { AgentFinderIcon } from "@jitaspace/eve-icons";
import { removeUndefinedFields } from "@jitaspace/utils";

import { AgentsTable } from "~/components/Agents";
import { MainLayout } from "~/layouts";


type PageProps = {
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
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const agents = await prisma.agent
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

    const agentTypes = await prisma.agentType.findMany({
      select: {
        agentTypeId: true,
        name: true,
      },
    });

    const agentDivisions = await prisma.npcCorporationDivision.findMany({
      select: {
        npcCorporationDivisionId: true,
        name: true,
      },
    });

    return {
      props: {
        agents: agents.sort((a, b) => a.name.localeCompare(b.name)),
        agentTypes,
        agentDivisions,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 30, // 30 seconds on error
    };
  }
};

export default function Page({
  agents,
  agentTypes,
  agentDivisions,
}: PageProps) {
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

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Agents" />
      {page}
    </MainLayout>
  );
};
