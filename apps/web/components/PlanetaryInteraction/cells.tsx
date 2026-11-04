"use client";

import { Anchor, Badge, Group, Text } from "@mantine/core";

import type { CharactersCharacterIdPlanetsGetPlanetTypeEnum } from "@jitaspace/esi-client";
import {
  EveEntityAvatar,
  EveEntityName,
  SolarSystemName,
  TypeAvatar,
  TypeName,
} from "@jitaspace/eve-components";

import type { PiCatalog } from "./catalog";
import type { ColonyStatus } from "./colonies";
import {
  CharacterAnchor,
  CorporationAnchor,
  SolarSystemAnchor,
  TypeAnchor,
} from "~/components/Anchor";
import { HoverPrefetchLink } from "~/components/Link";
import { PlanetName } from "~/components/Text";
import { tierLabel } from "./catalog";
import { COLONY_STATUS_COLORS, COLONY_STATUS_LABELS } from "./colonies";

export const PLANET_TYPES = [
  "barren",
  "gas",
  "ice",
  "lava",
  "oceanic",
  "plasma",
  "storm",
  "temperate",
] as const satisfies readonly CharactersCharacterIdPlanetsGetPlanetTypeEnum[];

export const planetTypeLabel = (type: string) =>
  type.charAt(0).toUpperCase() + type.slice(1);

export const PLANET_TYPE_OPTIONS = PLANET_TYPES.map((type) => ({
  value: type,
  label: planetTypeLabel(type),
}));

export function CharacterCell({
  characterId,
}: Readonly<{ characterId: number }>) {
  return (
    <Group wrap="nowrap" gap="xs">
      <EveEntityAvatar
        entityId={characterId}
        category="character"
        size="sm"
        alt=""
      />
      <CharacterAnchor characterId={characterId} size="sm">
        <EveEntityName span entityId={characterId} category="character" />
      </CharacterAnchor>
    </Group>
  );
}

export function CorporationCell({
  corporationId,
}: Readonly<{ corporationId: number }>) {
  return (
    <Group wrap="nowrap" gap="xs">
      <EveEntityAvatar
        entityId={corporationId}
        category="corporation"
        size="sm"
        alt=""
      />
      <CorporationAnchor corporationId={corporationId} size="sm">
        <EveEntityName span entityId={corporationId} category="corporation" />
      </CorporationAnchor>
    </Group>
  );
}

export function PlanetCell({ planetId }: Readonly<{ planetId: number }>) {
  return (
    <Anchor
      component={HoverPrefetchLink}
      href={`/planet/${planetId}`}
      size="sm"
    >
      <PlanetName span inherit planetId={planetId} />
    </Anchor>
  );
}

export function SolarSystemCell({
  solarSystemId,
}: Readonly<{ solarSystemId: number }>) {
  return (
    <SolarSystemAnchor solarSystemId={solarSystemId} size="sm">
      <SolarSystemName span solarSystemId={solarSystemId} />
    </SolarSystemAnchor>
  );
}

/**
 * A commodity or pin type. The catalog names it without a request; a type it
 * does not know (a new one, or an empty catalog) falls back to ESI.
 */
export function TypeCell({
  typeId,
  catalog,
  withTier = false,
}: Readonly<{ typeId: number; catalog: PiCatalog; withTier?: boolean }>) {
  const info = catalog.types[typeId];
  return (
    <Group wrap="nowrap" gap="xs">
      <TypeAvatar typeId={typeId} size="sm" alt="" />
      <TypeAnchor typeId={typeId} size="sm">
        {info ? info.name : <TypeName span typeId={typeId} />}
      </TypeAnchor>
      {withTier && info?.tier !== null && info?.tier !== undefined && (
        <Badge size="xs" variant="light" color="gray">
          {tierLabel(info.tier)}
        </Badge>
      )}
    </Group>
  );
}

export function StatusBadge({ status }: Readonly<{ status: ColonyStatus }>) {
  return (
    <Badge color={COLONY_STATUS_COLORS[status]} variant="light" size="sm">
      {COLONY_STATUS_LABELS[status]}
    </Badge>
  );
}

export function DimmedText({ children }: Readonly<{ children: string }>) {
  return (
    <Text size="sm" c="dimmed">
      {children}
    </Text>
  );
}

const NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});
const INTEGER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export const formatNumber = (value: number) => NUMBER_FORMAT.format(value);
export const formatInteger = (value: number) => INTEGER_FORMAT.format(value);
export const formatPercent = (rate: number | undefined) =>
  rate === undefined ? "—" : `${NUMBER_FORMAT.format(rate * 100)}%`;

/** A UTC date and time, written the same way on server and client. */
export const formatEveTime = (time: number) =>
  `${new Date(time).toISOString().slice(0, 16).replace("T", " ")} UTC`;
