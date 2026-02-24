"use client";

import _React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Group,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useListState } from "@mantine/hooks";
import createGraph from "ngraph.graph";
import path from "ngraph.path";

import { MapIcon } from "@jitaspace/eve-icons";

import { RouteTable } from "~/components/Travel";

export interface TravelPageProps {
  initialWaypoints: string[];
  solarSystems: Record<
    string,
    { name: string; securityStatus: number; neighbors: number[] }
  >;
}

export default function TravelPage({
  solarSystems,
  initialWaypoints,
}: TravelPageProps) {
  const router = useRouter();

  const graph = useMemo(() => {
    const graph = createGraph();
    Object.entries(solarSystems ?? {}).forEach(([v, solarSystem]) => {
      graph.addNode(v, solarSystem);
    });
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
    const pathFinder = path.nba(graph, {
      distance(fromNode, toNode, _link) {
        const destinationSecurityStatus = toNode.data.securityStatus;
        if (destinationSecurityStatus < 0) return 1 + nullSecPenalty;
        if (destinationSecurityStatus < 0.5) return 1 + lowSecPenalty;
        if (destinationSecurityStatus >= 0.5) return 1 + highSecPenalty;
        return 1;
      },
    });
    return pathFinder.find(waypoints[1]!, waypoints[0]!);
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
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
            <div>
              <Text size="sm" fw={500}>
                Null Sec Penalty ({nullSecPenalty})
              </Text>
              <Slider
                defaultValue={nullSecPenalty}
                min={0}
                max={500}
                onChange={setNullSecPenalty}
              />
            </div>
            <div>
              <Text size="sm" fw={500}>
                Low Sec Penalty ({lowSecPenalty})
              </Text>
              <Slider
                defaultValue={lowSecPenalty}
                min={0}
                max={500}
                onChange={setLowSecPenalty}
              />
            </div>
            <div>
              <Text size="sm" fw={500}>
                High Sec Penalty ({highSecPenalty})
              </Text>
              <Slider
                defaultValue={highSecPenalty}
                min={0}
                max={500}
                onChange={setHighSecPenalty}
              />
            </div>
          </SimpleGrid>
        )}
        <RouteTable route={route} />
      </Stack>
    </Container>
  );
}
