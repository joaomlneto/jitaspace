"use client";

import type { ReactNode } from "react";
import { memo } from "react";

import type { EntityCardVariant } from "@jitaspace/ui";
import { useCharacter } from "@jitaspace/hooks";
import { CharacterCardDisplay } from "@jitaspace/ui";

import { useEntityRefs } from "./useEntityRefs";

export interface CharacterCardProps {
  characterId: number;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
}

/** `CharacterCardDisplay`, filled from ESI. */
export const CharacterCard = memo(
  ({
    characterId,
    variant = "full",
    headerRightSection,
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
