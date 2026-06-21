"use client";

import type { CardProps } from "@mantine/core";
import {
  Burger,
  Button,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { modals, openContextModal } from "@mantine/modals";

import {
  AllianceName,
  CharacterName,
  CharacterOnlineIndicator,
  CorporationName,
} from "@jitaspace/eve-components";
import { RecruitmentIcon, WalletIcon } from "@jitaspace/eve-icons";
import {
  useAuthenticatedCharacter,
  useAuthStore,
  useCharacterSkills,
} from "@jitaspace/hooks";
import { useCharacterWalletBalance } from "@jitaspace/hooks/src/hooks/character/useCharacterWalletBalance";
import {
  AllianceAnchor,
  AllianceAvatar,
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
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
  const removeCharacter = useAuthStore((state) => state.removeCharacter);

  if (!character) {
    return "character not found";
  }

  // When EVE can no longer refresh the token, collapse the card to a red
  // "session expired" state: just the avatar + name and the re-auth prompt.
  // The detailed sections are hidden because their data is stale / unfetchable.
  if (character.sessionExpired) {
    const characterName = character.accessTokenPayload.name;
    const confirmRemoveCharacter = () =>
      modals.openConfirmModal({
        title: `Remove ${characterName}?`,
        children: (
          <Text size="sm">
            Remove {characterName} from JitaSpace? You can add it back later by
            signing in again.
          </Text>
        ),
        labels: { confirm: "Remove", cancel: "Cancel" },
        confirmProps: { color: "red" },
        onConfirm: () => removeCharacter(characterId),
      });

    return (
      <Card
        withBorder
        radius="md"
        padding="md"
        className={classes.card}
        {...otherProps}
        style={{
          ...otherProps.style,
          backgroundColor: "var(--mantine-color-red-light)",
          borderColor: "var(--mantine-color-red-filled)",
        }}
      >
        <Stack gap="sm">
          <Group wrap="nowrap" align="center">
            <CharacterAvatar characterId={characterId} size={64} radius="md" />
            <div>
              <CharacterName
                characterId={characterId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              <Group wrap="nowrap" gap={6} mt={4}>
                <RecruitmentIcon width={16} />
                <Text size="sm" fw={500} c="red">
                  Session expired
                </Text>
              </Group>
            </div>
          </Group>
          <Text size="xs" c="red">
            EVE can no longer refresh this character. Sign in again to keep
            using it.
          </Text>
          <Group gap="xs">
            <Button
              size="xs"
              color="red"
              onClick={() =>
                openContextModal({
                  modal: "login",
                  title: "Login",
                  size: "xl",
                  innerProps: {},
                })
              }
            >
              Sign in again
            </Button>
            <Button
              size="xs"
              color="red"
              variant="subtle"
              onClick={confirmRemoveCharacter}
            >
              Remove character
            </Button>
          </Group>
        </Stack>
      </Card>
    );
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
