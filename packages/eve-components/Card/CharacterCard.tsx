"use client";

import { memo } from "react";
import { Group, Stack } from "@mantine/core";

import { useCharacter } from "@jitaspace/hooks";
import {
  AllianceAnchor,
  AllianceAvatar,
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
} from "@jitaspace/ui";

import { CharacterAnchor } from "../Anchor";
import { AllianceName, CharacterName, CorporationName } from "../Text";

interface CharacterCardProps {
  characterId: number;
}

export const CharacterCard = memo(({ characterId }: CharacterCardProps) => {
  const { data } = useCharacter(characterId);
  return (
    <Stack gap="xs">
      <Group>
        <Stack>
          <CharacterAvatar characterId={characterId} size="lg" />
        </Stack>
        <Stack gap="xs">
          <CharacterAnchor characterId={characterId}>
            <CharacterName size="md" characterId={characterId} fw={700} />
          </CharacterAnchor>
          {data !== undefined && (
            <Group gap="xs">
              <CorporationAvatar
                size="xs"
                corporationId={data.corporationId}
              />
              <CorporationAnchor corporationId={data.corporationId}>
                <CorporationName
                  size="xs"
                  corporationId={data.corporationId}
                />
              </CorporationAnchor>
            </Group>
          )}
          {data?.allianceId && (
            <Group gap="xs">
              <AllianceAvatar size="xs" allianceId={data.allianceId} />
              <AllianceAnchor allianceId={data.allianceId}>
                <AllianceName size="xs" allianceId={data.allianceId} />
              </AllianceAnchor>
            </Group>
          )}
        </Stack>
      </Group>
    </Stack>
  );
});
CharacterCard.displayName = "CharacterCard";
