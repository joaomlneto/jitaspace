"use client";

import { Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import { ControlJumpGateLayoutIcon } from "@jitaspace/eve-icons";
import {
  securityStatusBand,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

import type { GateNeighbour, SystemsById, UniverseSystem } from "./types";
import {
  ConstellationAnchor,
  RegionAnchor,
  SolarSystemAnchor,
} from "~/components/Anchor";
import { SectionHeading } from "~/components/EntityPage";

/** Wormhole space: its regions start at 11000000. */
export const isWormholeRegion = (regionId: number | undefined) =>
  (regionId ?? 0) >= 11_000_000;

/** A system's security band, or "Wormhole" in wormhole space. */
export const bandOf = (securityStatus: number, isWormhole: boolean) =>
  isWormhole ? "Wormhole" : securityStatusBand(securityStatus);

/**
 * A wormhole class as players name it. Only meaningful in wormhole space: the
 * SDE gives known space one too (7 high-sec, 8 low-sec, 9 null-sec: the class
 * of what spawns there).
 */
export const formatWormholeClass = (wormholeClassId: number) =>
  wormholeClassId <= 6 ? `C${wormholeClassId}` : String(wormholeClassId);

/** How many systems fall in each security band: "4 High-Sec, 2 Low-Sec". */
export const bandCounts = (
  systems: readonly UniverseSystem[],
  isWormhole: boolean,
) => {
  const bands = new Map<string, number>();
  for (const system of systems) {
    const band = bandOf(system.securityStatus, isWormhole);
    bands.set(band, (bands.get(band) ?? 0) + 1);
  }
  return [...bands].map(([band, n]) => `${n} ${band}`).join(", ");
};

/** Lowest and highest security, as badges. */
export function SecurityRange({
  systems,
}: Readonly<{ systems: readonly UniverseSystem[] }>) {
  const values = systems.map((system) => system.securityStatus);
  if (values.length === 0) return <>—</>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <Group gap={6} wrap="nowrap" component="span">
      <SolarSystemSecurityStatusBadge securityStatus={min} size="sm" />
      {max !== min && (
        <>
          –
          <SolarSystemSecurityStatusBadge securityStatus={max} size="sm" />
        </>
      )}
    </Group>
  );
}

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

/**
 * The constellations or regions one stargate away, each with the gates that
 * lead there. A neighbouring constellation names its region when it is not
 * `regionId`.
 */
export function GateNeighbours({
  title,
  kind,
  neighbours,
  systemsById,
  regionId,
}: Readonly<{
  title: string;
  kind: "constellation" | "region";
  neighbours: readonly GateNeighbour[];
  systemsById: SystemsById;
  regionId?: number;
}>) {
  if (neighbours.length === 0) return null;
  return (
    <Stack gap="sm">
      <SectionHeading icon={<ControlJumpGateLayoutIcon size={18} alt="" />}>
        {title}
      </SectionHeading>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
        {neighbours.map((neighbour) => (
          <Paper key={neighbour.id} withBorder radius="md" p="sm">
            <Stack gap={4}>
              <Group gap={6} justify="space-between" wrap="nowrap">
                {kind === "constellation" ? (
                  <ConstellationAnchor constellationId={neighbour.id} fw={600}>
                    {neighbour.name}
                  </ConstellationAnchor>
                ) : (
                  <RegionAnchor regionId={neighbour.id} fw={600}>
                    {neighbour.name}
                  </RegionAnchor>
                )}
                {neighbour.region && neighbour.region.id !== regionId && (
                  <RegionAnchor
                    regionId={neighbour.region.id}
                    size="xs"
                    c="dimmed"
                  >
                    {neighbour.region.name ?? neighbour.region.id}
                  </RegionAnchor>
                )}
              </Group>
              {neighbour.gates.map(([here, there]) => (
                <Text key={`${here.id}-${there.id}`} size="xs" c="dimmed">
                  {systemsById.get(here.id)?.name ?? here.name} → {there.name}
                </Text>
              ))}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
