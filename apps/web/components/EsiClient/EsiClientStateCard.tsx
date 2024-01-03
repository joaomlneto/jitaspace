import React, { useMemo } from "react";
import {
  Button,
  CopyButton,
  Group,
  Spoiler,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

import { useAuthStore } from "@jitaspace/hooks";
import {
  CharacterAvatar,
  CharacterName,
  FormattedDateText,
  TimeAgoText,
} from "@jitaspace/ui";

import { ScopesTable } from "../ScopeGuard";


export function EsiClientStateCard() {
  const { characters } = useAuthStore();

  const sortedCharacters = useMemo(
    () =>
      Object.values(characters).sort((a, b) =>
        a.accessTokenPayload.name.localeCompare(b.accessTokenPayload.name),
      ),
    [characters],
  );

  return sortedCharacters.map((character) => (
    <>
      <Group grow>
        <CopyButton value={character.accessToken}>
          {({ copied, copy }) => (
            <Button color={copied ? "teal" : "blue"} onClick={copy}>
              {copied ? "ESI Access Token Copied" : "Copy ESI Access Token"}
            </Button>
          )}
        </CopyButton>
        <CopyButton value={character.characterId.toString()}>
          {({ copied, copy }) => (
            <Button color={copied ? "teal" : "blue"} onClick={copy}>
              {copied ? "Character ID Copied" : "Copy Character ID"}
            </Button>
          )}
        </CopyButton>
      </Group>
      <Group justify="space-between">
        <Text>Authenticated</Text>

        <Tooltip
          color="dark"
          label={<Text size="sm">Character ID: {character.characterId}</Text>}
        >
          <Group>
            <CharacterAvatar characterId={character.characterId} size="sm" />

            <CharacterName characterId={character.characterId} />
          </Group>
        </Tooltip>
      </Group>

      <Group justify="space-between">
        <Text>Token expires</Text>
        <Group>
          <Tooltip
            color="dark"
            label={
              <FormattedDateText
                date={new Date(character.accessTokenExpirationDate)}
              />
            }
          >
            <div>
              <TimeAgoText
                span
                date={new Date(character.accessTokenExpirationDate)}
                addSuffix
              />
            </div>
          </Tooltip>
        </Group>
      </Group>

      {character.accessTokenPayload.scp.length > 0 && (
        <>
          <Title order={6}>
            {character.accessTokenPayload.scp.length} scopes granted
          </Title>
          <Spoiler
            maxHeight={0}
            showLabel={<Text size="sm">Show list of scopes</Text>}
            hideLabel={<Text size="sm">Hide list of scopes</Text>}
          >
            <ScopesTable
              scopes={character.accessTokenPayload.scp}
              showRawScopeNames
            />
          </Spoiler>
        </>
      )}
    </>
  ));
}
