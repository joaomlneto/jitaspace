"use client";

import { useDeferredValue, useMemo } from "react";
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
import {
  parseAsInteger,
  parseAsStringLiteral,
  throttle,
  useQueryStates,
} from "nuqs";

import { MapIcon } from "@jitaspace/eve-icons";

import { RouteTable } from "~/components/Travel";

export interface TravelPageProps {
  initialWaypoints: string[];
  solarSystems: Record<
    string,
    { name: string; securityStatus: number; neighbors: number[] }
  >;
}

type SolarSystemNodeData = TravelPageProps["solarSystems"][string];

/**
 * Route preferences are URL-synced, so the stored values are short slugs rather
 * than the display labels (`?pref=secure`, not `?pref=More%20Secure`).
 */
const ROUTE_PREFERENCES = ["shortest", "secure", "insecure", "custom"] as const;
type RoutePreference = (typeof ROUTE_PREFERENCES)[number];

const ROUTE_PREFERENCE_OPTIONS: { value: RoutePreference; label: string }[] = [
  { value: "shortest", label: "Shortest" },
  { value: "secure", label: "More Secure" },
  { value: "insecure", label: "Less Secure" },
  { value: "custom", label: "Custom" },
];

/**
 * The penalties each preset implies. Only "custom" reads them from the URL —
 * for the presets they are derived, which keeps `?pref=secure` from also
 * carrying three redundant penalty params that could be hand-edited into
 * disagreeing with the preference they belong to.
 */
const PRESET_PENALTIES: Record<
  Exclude<RoutePreference, "custom">,
  { nullSec: number; lowSec: number; highSec: number }
> = {
  shortest: { nullSec: 0, lowSec: 0, highSec: 0 },
  secure: { nullSec: 100, lowSec: 100, highSec: 0 },
  insecure: { nullSec: 0, lowSec: 0, highSec: 100 },
};

const travelControlParsers = {
  pref: parseAsStringLiteral(ROUTE_PREFERENCES).withDefault("shortest"),
  nullSec: parseAsInteger.withDefault(0),
  lowSec: parseAsInteger.withDefault(0),
  highSec: parseAsInteger.withDefault(0),
};

// The penalty sliders fire onChange continuously while dragging, so throttle the
// URL writes — nuqs still applies the value locally on every tick (the thumb
// stays responsive), it just doesn't hand the History API one entry per pixel.
const travelControlUrlOptions = {
  history: "replace" as const,
  limitUrlUpdates: throttle(500),
};

export default function TravelPage({
  solarSystems,
  initialWaypoints,
}: Readonly<TravelPageProps>) {
  const router = useRouter();

  const graph = useMemo(() => {
    const graph = createGraph<SolarSystemNodeData>();
    Object.entries(solarSystems).forEach(([v, solarSystem]) => {
      graph.addNode(v, solarSystem);
    });
    Object.entries(solarSystems).forEach(([v, { neighbors }]) => {
      neighbors.forEach((u) => graph.addLink(v, u.toString()));
    });
    return graph;
  }, [solarSystems]);

  const [waypoints, waypointHandlers] = useListState<string>(initialWaypoints);

  const [{ pref: routePreference, nullSec, lowSec, highSec }, setControls] =
    useQueryStates(travelControlParsers, travelControlUrlOptions);

  // Presets derive their penalties; only "custom" uses the URL values.
  const penalties =
    routePreference === "custom"
      ? { nullSec, lowSec, highSec }
      : PRESET_PENALTIES[routePreference];

  // The penalty sliders fire `onChange` continuously while dragging. Running the
  // NBA* pathfinder over the full New Eden graph (thousands of systems) on every
  // tick blocks the main thread and wrecks Interaction to Next Paint. Deferring
  // the values the route depends on keeps the slider thumb and live labels
  // responsive (urgent update), while React recomputes the route as a
  // lower-priority, interruptible transition that coalesces rapid changes.
  const deferredNullSecPenalty = useDeferredValue(penalties.nullSec);
  const deferredLowSecPenalty = useDeferredValue(penalties.lowSec);
  const deferredHighSecPenalty = useDeferredValue(penalties.highSec);

  const route = useMemo(() => {
    const start = waypoints[1];
    const end = waypoints[0];
    // Empty slots are held as "" (see the Select onChange) — treat those, and
    // missing entries, as "no waypoint" so we never hand ngraph an unknown node.
    if (!start || !end) return [];
    const pathFinder = path.nba(graph, {
      distance(fromNode, toNode, _link) {
        const destinationSecurityStatus = toNode.data.securityStatus;
        if (destinationSecurityStatus < 0) return 1 + deferredNullSecPenalty;
        if (destinationSecurityStatus < 0.5) return 1 + deferredLowSecPenalty;
        if (destinationSecurityStatus >= 0.5) return 1 + deferredHighSecPenalty;
        return 1;
      },
    });
    return pathFinder.find(start, end);
  }, [
    graph,
    waypoints,
    deferredNullSecPenalty,
    deferredLowSecPenalty,
    deferredHighSecPenalty,
  ]);

  const solarSystemSelectData = useMemo(() => {
    return Object.entries(solarSystems)
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
          {/* A route needs an origin and a destination, so always render at
              least two selects — a bare /travel visit has no initial waypoints
              and would otherwise show an empty, unusable form. */}
          {Array.from({ length: Math.max(2, waypoints.length) }, (_, index) => (
            <Select
              label="Waypoint"
              data={solarSystemSelectData}
              searchable
              limit={100}
              // Deselecting a required waypoint (Mantine's default) would
              // remove it with no way to add one back — keep it non-nullable.
              allowDeselect={false}
              // Padding slots are absent (undefined) or held as "" — both match
              // no option, so the Select simply renders as empty/unselected.
              value={waypoints[index] ?? null}
              onChange={(value) => {
                if (value === null) return;
                // Build the next array explicitly and use it for BOTH the
                // state update and the pushed URL. Reading `waypoints` after
                // the async list-state update sees the stale pre-change array,
                // which left the address bar one interaction behind.
                const nextWaypoints = Array.from(
                  { length: Math.max(waypoints.length, index + 1) },
                  (_, i) => (i === index ? value : (waypoints[i] ?? "")),
                );
                waypointHandlers.setState(nextWaypoints);
                router.push(
                  `/travel/${nextWaypoints
                    .map((systemId) => solarSystems[systemId]?.name ?? "")
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
              data={ROUTE_PREFERENCE_OPTIONS}
              onChange={(value) => {
                // Switching to Custom seeds the sliders from whatever the
                // current preset resolves to, so they don't jump to zero;
                // switching to a preset clears the penalty params (null) since
                // the preset implies them.
                void setControls(
                  value === "custom"
                    ? { pref: "custom", ...penalties }
                    : {
                        pref: value as RoutePreference,
                        nullSec: null,
                        lowSec: null,
                        highSec: null,
                      },
                );
              }}
            />
          </div>
        </Group>
        {routePreference === "custom" && (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
            {/* Controlled (not defaultValue) so a shared `?nullSec=…` link
                actually moves the thumb. */}
            <div>
              <Text size="sm" fw={500}>
                Null Sec Penalty ({nullSec})
              </Text>
              <Slider
                value={nullSec}
                min={0}
                max={500}
                onChange={(value) => void setControls({ nullSec: value })}
              />
            </div>
            <div>
              <Text size="sm" fw={500}>
                Low Sec Penalty ({lowSec})
              </Text>
              <Slider
                value={lowSec}
                min={0}
                max={500}
                onChange={(value) => void setControls({ lowSec: value })}
              />
            </div>
            <div>
              <Text size="sm" fw={500}>
                High Sec Penalty ({highSec})
              </Text>
              <Slider
                value={highSec}
                min={0}
                max={500}
                onChange={(value) => void setControls({ highSec: value })}
              />
            </div>
          </SimpleGrid>
        )}
        <RouteTable route={route} />
      </Stack>
    </Container>
  );
}
