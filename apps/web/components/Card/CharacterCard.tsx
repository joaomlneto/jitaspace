"use client";

import { memo } from "react";
import { Group, Stack } from "@mantine/core";

import {
  AllianceName,
  CharacterName,
  CorporationName,
} from "@jitaspace/eve-components";
import { useCharacter } from "@jitaspace/hooks";
import {
  AllianceAvatar,
  CharacterAvatar,
  CorporationAvatar,
} from "@jitaspace/ui";

import {
  AllianceAnchor,
  CharacterAnchor,
  CorporationAnchor,
} from "~/components/Anchor";
import { CsmCandidateBadge } from "~/components/Badge";

interface CharacterCardProps {
  characterId: number;
  /**
   * Show the "CSM 21 Candidate" badge for a candidate. Off on `/csm`, where
   * every card is a candidate's.
   */
  withCsmBadge?: boolean;
}

export const CharacterCard = memo(
  ({ characterId, withCsmBadge = true }: CharacterCardProps) => {
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
            {withCsmBadge && (
              <CsmCandidateBadge
                characterId={characterId}
                size="sm"
                style={{ alignSelf: "flex-start", cursor: "pointer" }}
              />
            )}
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
  },
);
CharacterCard.displayName = "CharacterCard";
