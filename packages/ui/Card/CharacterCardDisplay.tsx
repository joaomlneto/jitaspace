"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { Text } from "@mantine/core";

import type { EntityCardVariant, EntityRef } from "./types";
import { CharacterAvatar } from "../Avatar";
import { DateHoverCard, FormattedDateText } from "../DateText";
import { EntityCard } from "./EntityCard";
import {
  entityCardAvatarProps,
  EntityCardTitle,
  EntityLink,
} from "./EntityLink";

export interface CharacterCardData {
  name?: string;
  corporation?: EntityRef;
  alliance?: EntityRef;
  /** Factional warfare militia. */
  faction?: EntityRef;
  birthday?: Date;
  /** The character's own security status, -10 to 5. */
  securityStatus?: number;
}

export interface CharacterCardDisplayProps {
  characterId: number;
  /** Omit while loading. */
  character?: CharacterCardData;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
}

/** A character, with their corporation, alliance and militia. */
export const CharacterCardDisplay = memo(
  ({
    characterId,
    character,
    variant = "full",
    headerRightSection,
  }: CharacterCardDisplayProps) => {
    return (
      <EntityCard
        variant={variant}
        loading={!character}
        avatar={
          <CharacterAvatar
            characterId={characterId}
            {...entityCardAvatarProps(variant)}
          />
        }
        title={
          <EntityCardTitle
            kind="character"
            entity={{ id: characterId, name: character?.name }}
            variant={variant}
          />
        }
        subtitle={
          <>
            <EntityLink
              kind="corporation"
              entity={character?.corporation}
              c="dimmed"
            />
            <EntityLink
              kind="alliance"
              entity={character?.alliance}
              c="dimmed"
            />
            {variant === "full" && (
              <EntityLink
                kind="faction"
                entity={character?.faction}
                c="dimmed"
              />
            )}
          </>
        }
        headerRightSection={headerRightSection}
        stats={[
          {
            label: "Born",
            value: character?.birthday && (
              <DateHoverCard date={character.birthday}>
                <FormattedDateText
                  date={character.birthday}
                  format="yyyy-MM-dd"
                  size="xs"
                />
              </DateHoverCard>
            ),
          },
          {
            label: "Security status",
            value: character?.securityStatus !== undefined && (
              <Text
                size="xs"
                c={character.securityStatus < 0 ? "red" : undefined}
              >
                {character.securityStatus.toFixed(1)}
              </Text>
            ),
          },
        ]}
      />
    );
  },
);
CharacterCardDisplay.displayName = "CharacterCardDisplay";
