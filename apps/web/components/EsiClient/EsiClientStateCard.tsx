import React from "react";
import { Group, Loader, Text } from "@mantine/core";





export function EsiClientStateCard() {
  // TODO: Migrate to new ESI React Client Library

  if (true) {
    return (
      <Group>
        <Loader />
        <Text>ESI Client Loading…</Text>
      </Group>
    );
  }

  /*
  return (
    <>
      <Group grow>
        {accessToken && (
          <CopyButton value={accessToken}>
            {({ copied, copy }) => (
              <Button color={copied ? "teal" : "blue"} onClick={copy}>
                {copied ? "ESI Access Token Copied" : "Copy ESI Access Token"}
              </Button>
            )}
          </CopyButton>
        )}
        {characterId !== undefined && (
          <CopyButton value={characterId.toString()}>
            {({ copied, copy }) => (
              <Button color={copied ? "teal" : "blue"} onClick={copy}>
                {copied ? "Character ID Copied" : "Copy Character ID"}
              </Button>
            )}
          </CopyButton>
        )}
      </Group>
      <Group position="apart">
        <Text>Authenticated</Text>

        {characterId && (
          <Tooltip
            color="dark"
            label={<Text size="sm">Character ID: {characterId}</Text>}
          >
            <Group>
              <CharacterAvatar characterId={characterId} size="sm" />

              <CharacterName characterId={characterId} />
            </Group>
          </Tooltip>
        )}
        {!characterId && <Text>No</Text>}
      </Group>
      {tokenExpirationDate && (
        <Group position="apart">
          <Text>Token expires</Text>
          <Group>
            {tokenExpirationDate && (
              <Tooltip
                color="dark"
                label={<FormattedDateText date={tokenExpirationDate} />}
              >
                <div>
                  <TimeAgoText span date={tokenExpirationDate} addSuffix />
                </div>
              </Tooltip>
            )}
          </Group>
        </Group>
      )}
      {scopes.length > 0 && (
        <>
          <Title order={6}>{scopes.length} scopes granted</Title>
          <Spoiler
            maxHeight={0}
            showLabel={<Text size="sm">Show list of scopes</Text>}
            hideLabel={<Text size="sm">Hide list of scopes</Text>}
          >
            <ScopesTable scopes={scopes} showRawScopeNames />
          </Spoiler>
        </>
      )}
    </>
  );*/
}
