"use client";

import React from "react";
import {
  Burger,
  Card,
  CardProps,
  Group,
  Skeleton,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";

import { WalletIcon } from "@jitaspace/eve-icons";
import {
  useAuthenticatedCharacter,
  useCharacterSkills,
} from "@jitaspace/hooks";
import { useCharacterWalletBalance } from "@jitaspace/hooks/src/hooks/character/useCharacterWalletBalance";
import {
  AllianceAnchor,
  AllianceAvatar,
  AllianceName,
  CharacterAvatar,
  CharacterName,
  CharacterOnlineIndicator,
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  ISKAmount,
  TypeAvatar,
} from "@jitaspace/ui";

import {
  CharacterLocationCard,
  CharacterSkillTrainingCard,
} from "~/components/Card";
import { EsiCurrentShipFittingCard } from "~/components/Fitting";
import { CharacterMenu } from "~/components/Menu";
import classes from "./AuthenticatedCharacterCard.module.css";

export type AuthenticatedCharacterCardProps = CardProps & {
  characterId: number;
};

export const AuthenticatedCharacterCard = ({
  characterId,
  ...otherProps
}: AuthenticatedCharacterCardProps) => {
  const character = useAuthenticatedCharacter(characterId);
  const { data: balance, isAllowed: isAllowedToReadWalletBalance } =
    useCharacterWalletBalance(characterId);

  const { data: skills, hasToken: isAllowedToReadSP } =
    useCharacterSkills(characterId);

  if (!character) {
    return "character not found";
  }

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" justify="space-between" align="start">
          <Group wrap="nowrap" align="start">
            <CharacterOnlineIndicator characterId={characterId} offset={8}>
              <CharacterAvatar
                characterId={characterId}
                size={96}
                radius="md"
              />
            </CharacterOnlineIndicator>
            <div>
              <CharacterName
                characterId={characterId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />

              <Group wrap="nowrap" gap="xs" mt={6}>
                <CorporationAvatar
                  corporationId={character.corporationId}
                  size="1rem"
                  className={classes.headerIcon}
                />
                <CorporationAnchor corporationId={character.corporationId}>
                  <CorporationName
                    corporationId={character.corporationId}
                    fz="xs"
                    c="dimmed"
                  />
                </CorporationAnchor>
              </Group>

              {character.allianceId && (
                <Group wrap="nowrap" gap="xs" mt={4}>
                  <AllianceAvatar
                    allianceId={character.allianceId}
                    size="1rem"
                    className={classes.headerIcon}
                  />
                  <AllianceAnchor allianceId={character.allianceId}>
                    <AllianceName
                      allianceId={character.allianceId}
                      fz="xs"
                      c="dimmed"
                    />
                  </AllianceAnchor>
                </Group>
              )}

              {isAllowedToReadWalletBalance && (
                <Group wrap="nowrap" gap="xs" mt={4}>
                  <WalletIcon width={16} />
                  <Skeleton visible={!balance?.data} width="auto">
                    <ISKAmount
                      size="xs"
                      amount={balance?.data}
                      showFullAmount
                    />
                  </Skeleton>
                </Group>
              )}

              {isAllowedToReadSP && (
                <Group wrap="nowrap" gap="xs" mt={4}>
                  <TypeAvatar typeId={19430} size={16} />
                  <Skeleton visible={!balance?.data} width="auto">
                    <Text size="xs">
                      {skills?.data.total_sp.toLocaleString()} SP
                    </Text>
                  </Skeleton>
                </Group>
              )}
            </div>
          </Group>
          <CharacterMenu characterId={characterId}>
            <Burger size="sm" />
          </CharacterMenu>
        </Group>
        <UnstyledButton
          w="100%"
          onClick={() => {
            openContextModal({
              modal: "currentShipFitting",
              withCloseButton: false,
              size: "sm",
              padding: 0,
              innerProps: { characterId: characterId },
              style: {
                padding: 0,
                margin: 0,
              },
            });
          }}
          mt="xs"
        >
          <EsiCurrentShipFittingCard
            characterId={characterId}
            hideModules
            withBorder={true}
          />
        </UnstyledButton>
        <UnstyledButton w="100%" mt="xs">
          <CharacterLocationCard characterId={characterId} />
        </UnstyledButton>
        <UnstyledButton w="100%" mt="xs">
          <CharacterSkillTrainingCard characterId={characterId} />
        </UnstyledButton>
      </Card.Section>
    </Card>
  );
};
