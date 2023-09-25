import React, { useMemo, useState, type ReactElement } from "react";
import { GetStaticProps } from "next";
import {
  Container,
  Group,
  JsonInput,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Table,
  Title,
} from "@mantine/core";
import axios from "axios";
import { NextSeo } from "next-seo";
import createGraph from "ngraph.graph";
import path from "ngraph.path";

import { prisma } from "@jitaspace/db";
import { useGetUniverseSystemKills } from "@jitaspace/esi-client";
import { MapIcon } from "@jitaspace/eve-icons";
import {
  SolarSystemAnchor,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

import { ESI_BASE_URL } from "~/config/constants";
import { MainLayout } from "~/layouts";

type PageProps = {
  solarSystems: Record<
    number,
    { name: string; securityStatus: number; neighbors: number[] }
  >;
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    // FIXME: THIS SHOULD NOT BE REQUIRED
    axios.defaults.baseURL = ESI_BASE_URL;

    const solarSystemsQuery = await prisma.solarSystem.findMany({
      select: {
        solarSystemId: true,
        name: true,
        securityStatus: true,
        stargates: {
          select: {
            DestinationStargate: {
              select: {
                solarSystemId: true,
              },
            },
          },
        },
      },
    });

    const solarSystems: Record<
      number,
      { name: string; securityStatus: number; neighbors: number[] }
    > = {};
    solarSystemsQuery.forEach((solarSystem) => {
      solarSystems[solarSystem.solarSystemId] = {
        name: solarSystem.name,
        securityStatus: solarSystem.securityStatus.toNumber(),
        neighbors: solarSystem.stargates.flatMap(
          (stargate) => stargate.DestinationStargate.solarSystemId,
        ),
      };
    });

    return {
      props: {
        solarSystems,
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

export default function Page({ solarSystems }: PageProps) {
  const baseGraph = useMemo(() => {
    const baseGraph = createGraph();
    // create all nodes
    Object.entries(solarSystems).forEach(([v, { securityStatus }]) => {
      baseGraph.addNode(v);
    });
    // create all edges
    Object.entries(solarSystems).forEach(([v, { neighbors }]) => {
      neighbors.forEach((u) => baseGraph.addLink(v, u.toString()));
    });
    return baseGraph;
  }, [solarSystems]);

  const { data: systemKillsData } = useGetUniverseSystemKills();

  const systemKills = useMemo(() => {
    const index: Record<
      string,
      { npcKills: number; podKills: number; shipKills: number }
    > = {};
    systemKillsData?.data.forEach(
      (system) =>
        (index[system.system_id] = {
          npcKills: system.npc_kills,
          podKills: system.pod_kills,
          shipKills: system.ship_kills,
        }),
    );
    return index;
  }, [systemKillsData]);

  const [source, setSource] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);

  const [nullSecPenalty, setNullSecPenalty] = useState<number>(0);
  const [lowSecPenalty, setLowSecPenalty] = useState<number>(0);

  const route = useMemo(() => {
    if (!baseGraph || !source || !destination) return [];
    //console.time("PATH FIND");
    const result = path.nba(baseGraph, {
      distance(fromNode, toNode, link) {
        const destinationSecurityStatus =
          // @ts-expect-error this is guaranteed to succeed, type-wise
          solarSystems[toNode.id].securityStatus;
        if (destinationSecurityStatus < 0) return 1 + nullSecPenalty;
        if (destinationSecurityStatus < 0.5) return 1 + lowSecPenalty;
        return 1;
      },
    });
    //const x = result.find(30000142, 30002659);
    const x = result.find(destination, source);
    //console.timeEnd("PATH FIND");
    return x;
  }, [baseGraph, source, destination, nullSecPenalty, lowSecPenalty]);

  const solarSystemSelectData = useMemo(() => {
    return Object.entries(solarSystems)
      .map(([solarSystemId, { name }]) => ({
        value: solarSystemId,
        label: name,
      }))
      .toSorted((a, b) => a.label.localeCompare(b.label));
  }, [solarSystems]);

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <MapIcon width={48} />
          <Title>Travel Planner</Title>
        </Group>
        <Title order={3}>Settings</Title>
        <Group>
          <Select
            label="From"
            data={solarSystemSelectData}
            searchable
            value={source}
            onChange={setSource}
          />
          <Select
            label="To"
            data={solarSystemSelectData}
            searchable
            value={destination}
            onChange={setDestination}
          />
        </Group>
        <SimpleGrid cols={2}>
          <Slider
            label="Null Sec Penalty"
            min={0}
            max={100}
            marks={[
              { value: 0, label: "No penalty" },
              { value: 100, label: "Avoid" },
            ]}
            value={nullSecPenalty}
            onChange={setNullSecPenalty}
          />
          <Slider
            label="Low Sec Penalty"
            min={0}
            max={100}
            marks={[
              { value: 0, label: "No penalty" },
              { value: 100, label: "Avoid" },
            ]}
            value={lowSecPenalty}
            onChange={setLowSecPenalty}
          />
        </SimpleGrid>
        {route?.length > 0 && (
          <>
            <Title order={3}>Path ({route.length - 1} jumps)</Title>
            <Table highlightOnHover>
              <thead>
                <tr>
                  <th>Jump</th>
                  <th>Solar System</th>
                  <th>NPC Kills</th>
                  <th>Ship Kills</th>
                  <th>Pod Kills</th>
                </tr>
              </thead>
              <tbody>
                {route.map((node, index) => (
                  <tr key={node.id}>
                    <td>{index == 0 ? "Start" : index}</td>
                    <td>
                      <Group>
                        <SolarSystemSecurityStatusBadge
                          solarSystemId={node.id}
                        />
                        <SolarSystemAnchor solarSystemId={node.id}>
                          <SolarSystemName solarSystemId={node.id} />
                        </SolarSystemAnchor>
                      </Group>
                    </td>
                    <td>{systemKills[node.id]?.npcKills ?? 0}</td>
                    <td>{systemKills[node.id]?.shipKills ?? 0}</td>
                    <td>{systemKills[node.id]?.podKills ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
        {false && (
          <JsonInput
            value={JSON.stringify(
              {
                numNodes: baseGraph.getNodeCount(),
                numLinks: baseGraph.getLinkCount(),
                route,
                solarSystems,
              },
              null,
              2,
            )}
            autosize
            maxRows={30}
          />
        )}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Travel Planner" />
      {page}
    </MainLayout>
  );
};
