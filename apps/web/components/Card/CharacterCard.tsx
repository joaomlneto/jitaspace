"use client";

import type { CardProps } from "@mantine/core";
import type { ReactNode } from "react";
import { memo } from "react";

import type { EntityCardVariant } from "@jitaspace/ui";
import { useCharacter } from "@jitaspace/hooks";
import { CharacterCardDisplay } from "@jitaspace/ui";

import { CsmCandidateBadge } from "~/components/Badge";
import { useEntityRefs } from "./useEntityRefs";

export interface CharacterCardProps {
  characterId: number;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
  /**
   * Show the "CSM 21 Candidate" badge for a candidate. Off on `/csm`, where
   * every card is a candidate's.
   */
  withCsmBadge?: boolean;
  /** Passed to the card frame, e.g. `withBorder={false}` to embed it. */
  cardProps?: Omit<CardProps, "children">;
}

/** `CharacterCardDisplay`, filled from ESI. */
export const CharacterCard = memo(
  ({
    characterId,
    variant = "full",
    headerRightSection,
    withCsmBadge = true,
    cardProps,
  }: CharacterCardProps) => {
    const { data: character } = useCharacter(characterId);
    const ref = useEntityRefs([
      character?.corporationId,
      character?.allianceId,
      character?.factionId,
    ]);

    return (
      <CharacterCardDisplay
        characterId={characterId}
        variant={variant}
        headerRightSection={headerRightSection}
        cardProps={cardProps}
        badges={
          withCsmBadge && (
            <CsmCandidateBadge
              characterId={characterId}
              size="sm"
              style={{ cursor: "pointer" }}
            />
          )
        }
        character={
          character && {
            name: character.name,
            corporation: ref(character.corporationId),
            alliance: ref(character.allianceId),
            faction: ref(character.factionId),
            birthday: character.birthday ?? undefined,
            securityStatus: character.securityStatus,
          }
        }
      />
    );
  },
);
CharacterCard.displayName = "CharacterCard";
