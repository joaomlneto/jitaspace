import type { ReactElement } from "react";
import _React, { useMemo, useState } from "react";
import type { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import {
  Container,
  Group,
  Loader,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { NextSeo } from "next-seo";
import createGraph from "ngraph.graph";
import path from "ngraph.path";

import { prisma } from "@jitaspace/db";
import { MapIcon } from "@jitaspace/eve-icons";
import { toArrayIfNot } from "@jitaspace/utils";

import { RouteTable } from "~/components/Travel";
import { MainLayout } from "~/layouts";

interface PageProps {
  initialWaypoints: string[];
  solarSystems: Record<
    string,
    { name: string; securityStatus: number; neighbors: number[] }
  >;
}

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
      string,
      { name: string; securityStatus: number; neighbors: number[] }
    > = {};
    solarSystemsQuery.forEach((solarSystem) => {
      solarSystems[solarSystem.solarSystemId] = {
        name: solarSystem.name,
        securityStatus: solarSystem.securityStatus.toNumber(),
        neighbors: solarSystem.stargates.flatMap(
          (stargate) => stargate.DestinationStargate!.solarSystemId,
        ),
      };
    });

    const parseWaypoint = (waypoint: string): string | null => {
      return (
        Object.entries(solarSystems).find(
          ([solarSystemId, { name }]) =>
            solarSystemId == waypoint ||
            name.toLowerCase() == waypoint?.toLowerCase(),
        )?.[0] ?? null
      );
    };

    const initialWaypoints = toArrayIfNot(context.params?.waypoints ?? [])
      .map((waypoint) => parseWaypoint(waypoint.replaceAll("_", " ")))
      .filter((x) => x !== null); // FIXME: should not need typecast

    return {
      props: {
        initialWaypoints,
        solarSystems,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch {
    return {
      notFound: true,
      revalidate: 3600, // at most once per hour
    };
  }
};

export default function Page({ solarSystems, initialWaypoints }: PageProps) {
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
    Object.entries(solarSystems ?? {}).forEach(([v, solarSystem]) => {
      graph.addNode(v, solarSystem);
    });
    // create all edges
    Object.entries(solarSystems ?? {}).forEach(([v, { neighbors }]) => {
      neighbors.forEach((u) => graph.addLink(v, u.toString()));
    });
    return graph;
  }, [solarSystems]);

  const [waypoints, waypointHandlers] = useListState<string>(initialWaypoints);

  const [routePreference, setRoutePreference] = useState<string>("Shortest");
  const [nullSecPenalty, setNullSecPenalty] = useState<number>(0);
  const [lowSecPenalty, setLowSecPenalty] = useState<number>(0);
  const [highSecPenalty, setHighSecPenalty] = useState<number>(0);

  const route = useMemo(() => {
    if (!graph || waypoints.length < 2) return [];
    console.time("PATH FIND");
    const pathFinder = path.nba(graph, {
      distance(fromNode, toNode, _link) {
        const destinationSecurityStatus = toNode.data.securityStatus;
        if (destinationSecurityStatus < 0) return 1 + nullSecPenalty;
        if (destinationSecurityStatus < 0.5) return 1 + lowSecPenalty;
        if (destinationSecurityStatus >= 0.5) return 1 + highSecPenalty;
        return 1;
      },
    });
    const route = pathFinder.find(waypoints[1]!, waypoints[0]!);
    console.timeEnd("PATH FIND");
    return route;
  }, [graph, waypoints, nullSecPenalty, lowSecPenalty, highSecPenalty]);

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
        <Group align="end">
          {waypoints.map((waypoint, index) => (
            <Select
              label="Waypoint"
              data={solarSystemSelectData}
              searchable
              value={waypoints[index]}
              onChange={(value) => {
                if (value === null) {
                  waypointHandlers.remove(index);
                } else {
                  waypointHandlers.setItem(index, value);
                }
                router.push(
                  `/travel/${waypoints
                    .map((systemId) => solarSystems[systemId]!.name)
                    .join("/")}`,
                );
              }}
              key={index}
            />
          ))}
          <div>
            <Text size="sm" fw={500}>
              Prefer
            </Text>
            <SegmentedControl
              value={routePreference}
              data={["Shortest", "More Secure", "Less Secure", "Custom"]}
              onChange={(value) => {
                if (value === "Shortest") {
                  setLowSecPenalty(0);
                  setNullSecPenalty(0);
                  setHighSecPenalty(0);
                }
                if (value === "More Secure") {
                  setLowSecPenalty(100);
                  setNullSecPenalty(100);
                  setHighSecPenalty(0);
                }
                if (value === "Less Secure") {
                  setLowSecPenalty(0);
                  setNullSecPenalty(0);
                  setHighSecPenalty(100);
                }
                setRoutePreference(value);
              }}
            />
          </div>
        </Group>
        {routePreference === "Custom" && (
          <SimpleGrid cols={3}>
            <div style={{ padding: 20 }}>
              <Text size="sm" fw={500}>
                High Sec Penalty
              </Text>
              <Slider
                min={0}
                max={100}
                value={highSecPenalty}
                onChange={setHighSecPenalty}
              />
            </div>
            <div style={{ padding: 20 }}>
              <Text size="sm" fw={500}>
                Low Sec Penalty
              </Text>
              <Slider
                min={0}
                max={100}
                value={lowSecPenalty}
                onChange={setLowSecPenalty}
              />
            </div>
            <div style={{ padding: 20 }}>
              <Text size="sm" fw={500}>
                Null Sec Penalty
              </Text>
              <Slider
                min={0}
                max={100}
                value={nullSecPenalty}
                onChange={setNullSecPenalty}
              />
            </div>
          </SimpleGrid>
        )}
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
