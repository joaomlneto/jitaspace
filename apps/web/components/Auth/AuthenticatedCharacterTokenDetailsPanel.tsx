"use client";

import React, { useMemo } from "react";
import {
  Button,
  CopyButton,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

import { useAuthenticatedCharacter } from "@jitaspace/hooks";
import {
  CharacterAvatar,
  CharacterName,
  FormattedDateText,
  TimeAgoText,
} from "@jitaspace/ui";

import { ScopesTable } from "~/components/ScopeGuard";

export type AuthenticatedCharacterTokenDetailsPanelProps = {
  characterId: number;
};

export const AuthenticatedCharacterTokenDetailsPanel = ({
  characterId,
}: AuthenticatedCharacterTokenDetailsPanelProps) => {
  const character = useAuthenticatedCharacter(characterId);

  const expirationDate = useMemo(() => {
    if (character == null) {
      return null;
    }
    return new Date(character?.accessTokenExpirationDate);
  }, [character?.accessTokenExpirationDate]);

  if (character == null) {
    return "Character not authenticated";
  }

  return (
    <Stack>
      <Group>
        <CharacterAvatar characterId={characterId} size="md" />
        <CharacterName characterId={characterId} />
      </Group>

      <Group grow>
        <CopyButton value={character.accessToken}>
          {({ copied, copy }) => (
            <Button color={copied ? "teal" : "blue"} onClick={copy}>
              {copied ? "ESI Access Token Copied" : "Copy ESI Access Token"}
            </Button>
          )}
        </CopyButton>
        <CopyButton value={characterId.toString()}>
          {({ copied, copy }) => (
            <Button color={copied ? "teal" : "blue"} onClick={copy}>
              {copied ? "Character ID Copied" : "Copy Character ID"}
            </Button>
          )}
        </CopyButton>
      </Group>

      {expirationDate && (
        <Group justify="space-between">
          <Text>Token expiration</Text>
          <Group>
            <Tooltip
              color="dark"
              label={<FormattedDateText size="sm" date={expirationDate} />}
            >
              <TimeAgoText date={expirationDate} addSuffix />
            </Tooltip>
          </Group>
        </Group>
      )}

      <Group justify="space-between">
        <Title order={4}>Access Token Scopes</Title>
        <ScopesTable scopes={character.accessTokenPayload.scp} />
      </Group>
    </Stack>
  );
};
