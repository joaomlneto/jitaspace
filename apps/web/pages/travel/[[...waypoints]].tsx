import React, { useMemo, useState, type ReactElement } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import {
  Container,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { NextSeo } from "next-seo";
import createGraph from "ngraph.graph";
import path from "ngraph.path";

import { prisma } from "@jitaspace/db";
import { useGetUniverseSystemKills } from "@jitaspace/esi-client";
import { MapIcon } from "@jitaspace/eve-icons";
import { toArrayIfNot } from "@jitaspace/utils";

import { RouteTable } from "~/components/Travel";
import { MainLayout } from "~/layouts";

type PageProps = {
  waypoints: string[];
  solarSystems: Record<
    number,
    { name: string; securityStatus: number; neighbors: number[] }
  >;
};

export const getStaticPaths: GetStaticPaths = async () => {
  // Do not pre-render any static pages - faster builds, but slower initial page load
  return {
    paths: [],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
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

    const parseWaypoint = (waypoint: string | undefined): string | null => {
      return (
        Object.entries(solarSystems).find(
          ([solarSystemId, { name }]) =>
            solarSystemId == waypoint ||
            name.toLowerCase() == waypoint?.toLowerCase(),
        )?.[0] ?? null
      );
    };

    const waypoints = toArrayIfNot(context.params?.waypoints ?? [])
      .map((waypoint) => parseWaypoint(waypoint))
      .filter((x) => x !== null) as string[]; // FIXME: should not need typecast

    return {
      props: {
        waypoints,
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

export default function Page({ solarSystems, waypoints }: PageProps) {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading solar systems...</Text>
        </Group>
      </Container>
    );
  }

  const graph = useMemo(() => {
    const graph = createGraph();
    // create all nodes
    Object.entries(solarSystems ?? {}).forEach(([v, { securityStatus }]) => {
      graph.addNode(v);
    });
    // create all edges
    Object.entries(solarSystems ?? {}).forEach(([v, { neighbors }]) => {
      neighbors.forEach((u) => graph.addLink(v, u.toString()));
    });
    return graph;
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

  const [source, setSource] = useState<string | null>(waypoints[0] ?? null);
  const [destination, setDestination] = useState<string | null>(
    waypoints[1] ?? null,
  );

  const [nullSecPenalty, setNullSecPenalty] = useState<number>(0);
  const [lowSecPenalty, setLowSecPenalty] = useState<number>(0);

  const route = useMemo(() => {
    if (!graph || !source || !destination) return [];
    console.time("PATH FIND");
    const pathFinder = path.nba(graph, {
      distance(fromNode, toNode, link) {
        const destinationSecurityStatus =
          // @ts-expect-error this is guaranteed to succeed, type-wise
          solarSystems[toNode.id].securityStatus;
        if (destinationSecurityStatus < 0) return 1 + nullSecPenalty;
        if (destinationSecurityStatus < 0.5) return 1 + lowSecPenalty;
        return 1;
      },
    });
    const route = pathFinder.find(destination, source);
    console.timeEnd("PATH FIND");
    return route;
  }, [graph, source, destination, nullSecPenalty, lowSecPenalty]);

  const solarSystemSelectData = useMemo(() => {
    return Object.entries(solarSystems ?? {})
      .map(([solarSystemId, { name }]) => ({
        value: solarSystemId,
        label: name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [solarSystems]);

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <MapIcon width={48} />
          <Title>Travel Planner</Title>
        </Group>
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
            <RouteTable route={route} />
          </>
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
