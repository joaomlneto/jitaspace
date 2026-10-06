"use client";

import { Group, Text } from "@mantine/core";

import {
  ConstellationAnchor,
  RegionAnchor,
  SolarSystemAnchor,
} from "@jitaspace/eve-components";
import {
  CorporationAnchor,
  CorporationAvatar,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

/** A solar system and where it is, as the entity pages show one. */
export interface EntityLocation {
  solarSystemId: number;
  name: string;
  securityStatus: number;
  /** Shown between the system and the region when given. */
  constellationId?: number;
  constellationName?: string;
  regionId: number | null;
  regionName: string | null;
}

/** "0.9 Jita · Kimotoro · The Forge", each part linked. */
export function LocationTrail({
  location,
}: Readonly<{ location: EntityLocation }>) {
  return (
    <Group gap={6} wrap="wrap" component="span">
      <SolarSystemSecurityStatusBadge
        securityStatus={location.securityStatus}
        size="sm"
      />
      <SolarSystemAnchor solarSystemId={location.solarSystemId}>
        {location.name}
      </SolarSystemAnchor>
      {location.constellationId !== undefined && (
        <>
          <Text span c="dimmed">
            ·
          </Text>
          <ConstellationAnchor constellationId={location.constellationId}>
            {location.constellationName}
          </ConstellationAnchor>
        </>
      )}
      {location.regionId !== null && (
        <>
          <Text span c="dimmed">
            ·
          </Text>
          <RegionAnchor regionId={location.regionId}>
            {location.regionName}
          </RegionAnchor>
        </>
      )}
    </Group>
  );
}

/** A corporation's logo and linked name. */
export function CorporationLink({
  corporationId,
  name,
}: Readonly<{ corporationId: number; name: string }>) {
  return (
    <Group gap="xs" wrap="nowrap">
      <CorporationAvatar corporationId={corporationId} size="sm" />
      <CorporationAnchor corporationId={corporationId}>
        {name}
      </CorporationAnchor>
    </Group>
  );
}
