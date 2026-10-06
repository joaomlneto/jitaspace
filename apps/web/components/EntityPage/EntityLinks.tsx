"use client";

import type { ReactNode } from "react";
import { Group } from "@mantine/core";

import {
  AllianceName,
  CharacterAnchor,
  CharacterName,
  CorporationName,
  FactionAnchor,
  FactionName,
} from "@jitaspace/eve-components";
import {
  AllianceAnchor,
  AllianceAvatar,
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
  FactionAvatar,
} from "@jitaspace/ui";

import type { NamedRef } from "~/lib/namedRef";

/**
 * Avatar-and-link rows for the entity pages' stat cards. Each shows the name
 * the page already has, or resolves it by id when it does not.
 */

export function EntityLine({
  avatar,
  children,
}: Readonly<{ avatar: ReactNode; children: ReactNode }>) {
  return (
    <Group gap="xs" wrap="nowrap">
      {avatar}
      {children}
    </Group>
  );
}

export function CharacterLine({
  character,
}: Readonly<{ character: NamedRef }>) {
  return (
    <EntityLine
      avatar={<CharacterAvatar characterId={character.id} size="sm" />}
    >
      <CharacterAnchor characterId={character.id}>
        {character.name ?? <CharacterName span characterId={character.id} />}
      </CharacterAnchor>
    </EntityLine>
  );
}

export function CorporationLine({
  corporation,
}: Readonly<{ corporation: NamedRef }>) {
  return (
    <EntityLine
      avatar={<CorporationAvatar corporationId={corporation.id} size="sm" />}
    >
      <CorporationAnchor corporationId={corporation.id}>
        {corporation.name ?? (
          <CorporationName span corporationId={corporation.id} />
        )}
      </CorporationAnchor>
    </EntityLine>
  );
}

export function AllianceLine({ alliance }: Readonly<{ alliance: NamedRef }>) {
  return (
    <EntityLine avatar={<AllianceAvatar allianceId={alliance.id} size="sm" />}>
      <AllianceAnchor allianceId={alliance.id}>
        {alliance.name ?? <AllianceName span allianceId={alliance.id} />}
      </AllianceAnchor>
    </EntityLine>
  );
}

export function FactionLine({ faction }: Readonly<{ faction: NamedRef }>) {
  return (
    <EntityLine avatar={<FactionAvatar factionId={faction.id} size="sm" />}>
      <FactionAnchor factionId={faction.id}>
        {faction.name ?? <FactionName span factionId={faction.id} />}
      </FactionAnchor>
    </EntityLine>
  );
}
