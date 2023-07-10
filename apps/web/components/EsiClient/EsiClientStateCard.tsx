import React from "react";
import {
  Button,
  CopyButton,
  Group,
  Loader,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

import { useEsiClientContext } from "@jitaspace/esi-client";
import {
  CharacterAvatar,
  CharacterName,
  FormattedDateText,
  TimeAgoText,
} from "@jitaspace/ui";

import { ScopesTable } from "~/components/ScopeGuard";

export function EsiClientStateCard() {
  const {
    loading,
    characterId,
    scopes,
    isTokenValid,
    tokenExpirationDate,
    accessToken,
  } = useEsiClientContext();

  if (loading) {
    return (
      <Group>
        <Loader />
        <Text>ESI Client Loading…</Text>
      </Group>
    );
  }

  return (
    <>
      {accessToken && (
        <CopyButton value={accessToken}>
          {({ copied, copy }) => (
            <Button color={copied ? "teal" : "blue"} onClick={copy}>
              {copied ? "ESI Access Token Copied" : "Copy ESI Access Token"}
            </Button>
          )}
        </CopyButton>
      )}
      <Group position="apart">
        <Text>Token valid?</Text>
        <Text>{isTokenValid ? "Yes" : "No"}</Text>
      </Group>
      {characterId && (
        <Group position="apart">
          <Text>Authenticated as</Text>
          <Group>
            <CharacterAvatar characterId={characterId} radius="xl" />
            <CharacterName characterId={characterId} />
            <Text size="sm">{characterId}</Text>
          </Group>
        </Group>
      )}
      <Group position="apart">
        <Text>Token expires</Text>
        <Group>
          {tokenExpirationDate && (
            <Tooltip label={<FormattedDateText date={tokenExpirationDate} />}>
              <div>
                <TimeAgoText span date={tokenExpirationDate} addSuffix />
              </div>
            </Tooltip>
          )}
        </Group>
      </Group>
      {scopes.length > 0 && (
        <>
          <Title order={6}>{scopes.length} scopes granted</Title>
          <ScopesTable scopes={scopes} showRawScopeNames />
        </>
      )}
    </>
  );
}
