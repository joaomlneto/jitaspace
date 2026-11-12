"use client";

import { memo, useMemo } from "react";
import { Box, Group, Text } from "@mantine/core";

import type { ColonyLayout } from "@jitaspace/hooks";

import type { PiCatalog, PinKind } from "./catalog";
import { PIN_KIND_LABELS, PIN_KINDS, pinKindOf } from "./catalog";

/** Pin colours by kind; Mantine palette variables, so they follow the theme. */
export const PIN_KIND_COLORS: Record<PinKind, string> = {
  command_center: "var(--mantine-color-yellow-6)",
  extractor: "var(--mantine-color-teal-6)",
  processor: "var(--mantine-color-blue-6)",
  storage: "var(--mantine-color-grape-6)",
  launchpad: "var(--mantine-color-orange-6)",
  other: "var(--mantine-color-gray-6)",
};

const WIDTH = 480;
const HEIGHT = 300;
const PADDING = 24;

interface ProjectedPin {
  pinId: number;
  kind: PinKind;
  name: string;
  x: number;
  y: number;
}

/**
 * Lay the pins out on an equirectangular projection fitted to the colony.
 *
 * ESI gives each pin's latitude (0 at the north pole to π at the south) and
 * longitude (radians, wrapping at 2π). A colony covers a small patch, so the
 * longitudes are re-centred on their circular mean first: a colony straddling
 * the 0/2π seam would otherwise be split across the whole width.
 */
export function projectPins(
  pins: readonly { pin_id: number; latitude: number; longitude: number }[],
): Map<number, { x: number; y: number }> {
  const projected = new Map<number, { x: number; y: number }>();
  if (pins.length === 0) return projected;

  const meanLongitude = Math.atan2(
    pins.reduce((sum, pin) => sum + Math.sin(pin.longitude), 0),
    pins.reduce((sum, pin) => sum + Math.cos(pin.longitude), 0),
  );
  const points = pins.map((pin) => {
    // Wrap into (-π, π] around the mean.
    let longitude = pin.longitude - meanLongitude;
    longitude = Math.atan2(Math.sin(longitude), Math.cos(longitude));
    // A degree of longitude shrinks towards the poles.
    return {
      pinId: pin.pin_id,
      u: longitude * Math.sin(pin.latitude),
      v: pin.latitude,
    };
  });

  const us = points.map((point) => point.u);
  const vs = points.map((point) => point.v);
  const minU = Math.min(...us);
  const minV = Math.min(...vs);
  // Never zoom in past a small span, so a two-pin colony is not stretched
  // edge to edge.
  const span = Math.max(Math.max(...us) - minU, Math.max(...vs) - minV, 0.02);
  const scale = Math.min(WIDTH - 2 * PADDING, HEIGHT - 2 * PADDING) / span;
  const offsetX = (WIDTH - (Math.max(...us) - minU) * scale) / 2;
  const offsetY = (HEIGHT - (Math.max(...vs) - minV) * scale) / 2;

  for (const point of points) {
    projected.set(point.pinId, {
      x: offsetX + (point.u - minU) * scale,
      y: offsetY + (point.v - minV) * scale,
    });
  }
  return projected;
}

export interface ColonyMapProps {
  layout: ColonyLayout;
  catalog: PiCatalog;
  /** Describes the map for assistive technology. */
  label: string;
}

/**
 * A schematic map of a colony: its pins, coloured by kind, and the links
 * between them. A picture of what the tables beside it already list, so it is
 * labelled as one image rather than read pin by pin.
 */
export const ColonyMap = memo(({ layout, catalog, label }: ColonyMapProps) => {
  const pins = useMemo<ProjectedPin[]>(() => {
    const positions = projectPins(layout.pins);
    return layout.pins.flatMap((pin) => {
      const position = positions.get(pin.pin_id);
      if (!position) return [];
      const kind = pinKindOf(pin, catalog.types);
      return [
        {
          pinId: pin.pin_id,
          kind,
          name: catalog.types[pin.type_id]?.name ?? PIN_KIND_LABELS[kind],
          ...position,
        },
      ];
    });
  }, [layout.pins, catalog.types]);

  const byId = useMemo(
    () => new Map(pins.map((pin) => [pin.pinId, pin])),
    [pins],
  );
  const kindsShown = PIN_KINDS.filter((kind) =>
    pins.some((pin) => pin.kind === kind),
  );

  return (
    <Box>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={label}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          background: "var(--mantine-color-default-hover)",
          borderRadius: "var(--mantine-radius-md)",
        }}
      >
        {layout.links.map((link) => {
          const source = byId.get(link.source_pin_id);
          const destination = byId.get(link.destination_pin_id);
          if (!source || !destination) return null;
          return (
            <line
              key={`${link.source_pin_id}-${link.destination_pin_id}`}
              x1={source.x}
              y1={source.y}
              x2={destination.x}
              y2={destination.y}
              stroke="var(--mantine-color-dimmed)"
              strokeWidth={1 + link.link_level * 0.5}
              strokeOpacity={0.7}
            />
          );
        })}
        {pins.map((pin) => (
          <circle
            key={pin.pinId}
            cx={pin.x}
            cy={pin.y}
            r={pin.kind === "command_center" ? 9 : 6}
            fill={PIN_KIND_COLORS[pin.kind]}
            stroke="var(--mantine-color-body)"
            strokeWidth={2}
          >
            <title>{pin.name}</title>
          </circle>
        ))}
      </svg>
      <Group gap="md" mt="xs" aria-hidden>
        {kindsShown.map((kind) => (
          <Group key={kind} gap={6} wrap="nowrap">
            <Box
              w={10}
              h={10}
              style={{ borderRadius: "50%", background: PIN_KIND_COLORS[kind] }}
            />
            <Text size="xs">{PIN_KIND_LABELS[kind]}</Text>
          </Group>
        ))}
      </Group>
    </Box>
  );
});
ColonyMap.displayName = "ColonyMap";
