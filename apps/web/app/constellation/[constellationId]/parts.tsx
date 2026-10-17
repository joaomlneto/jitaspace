"use client";

import { Group } from "@mantine/core";

import { SolarSystemSecurityStatusBadge } from "@jitaspace/ui";

import type { ConstellationSystem } from "./types";
import { SolarSystemAnchor } from "~/components/Anchor";

/** The constellation's systems by id, for the panels that list some of them. */
export type SystemsById = ReadonlyMap<number, ConstellationSystem>;

/** A system's security badge and a link to its page, on one line. */
export function SystemLink({
  solarSystemId,
  systems,
}: Readonly<{ solarSystemId: number; systems: SystemsById }>) {
  const system = systems.get(solarSystemId);
  return (
    <Group gap={6} wrap="nowrap" component="span">
      {system && (
        <SolarSystemSecurityStatusBadge
          securityStatus={system.securityStatus}
          size="xs"
          miw="max-content"
        />
      )}
      <SolarSystemAnchor
        solarSystemId={solarSystemId}
        size="sm"
        style={{ whiteSpace: "nowrap" }}
      >
        {system?.name ?? solarSystemId}
      </SolarSystemAnchor>
    </Group>
  );
}
