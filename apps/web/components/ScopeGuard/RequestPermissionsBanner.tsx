import React, { useMemo } from "react";
import {
  Button,
  Center,
  Collapse,
  Container,
  Group,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { openContextModal } from "@mantine/modals";
import { signIn } from "next-auth/react";

import { type ESIScope } from "@jitaspace/esi-metadata";
import { useSelectedCharacter } from "@jitaspace/hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import classes from "./RequestPermissionsBanner.module.css";
import { ScopesTable } from "./ScopesTable";


export type RequestPermissionsBannerProps = {
  requiredScopes: ESIScope[];
};

export function RequestPermissionsBanner({
  requiredScopes,
}: RequestPermissionsBannerProps) {
  const selectedCharacter = useSelectedCharacter();
  const grantedScopes = useMemo(
    () => selectedCharacter?.accessTokenPayload.scp ?? [],
    [selectedCharacter],
  );

  const [openGrantedScopesTable, { toggle: toggleGrantedScopesTable }] =
    useDisclosure(false);

  const missingScopes = requiredScopes.filter(
    (scope) => !(grantedScopes ?? []).includes(scope),
  );

  return (
    <Container className={classes.root}>
      <Title className={classes.title}>Insufficient Scopes</Title>
      <Text
        color="dimmed"
        size="md"
        ta="center"
        className={classes.description}
      >
        We must request additional scopes to continue.
        <br />
        Click the login button to request them.
        <br />
        Alternatively, click the customize button to control which scopes are
        requested.
      </Text>
      <Group gap="md" justify="center">
        <LoginWithEveOnlineButton
          size="small"
          onClick={() => {
            void signIn(
              "eveonline",
              {},
              {
                scope: [...(grantedScopes ?? []), ...missingScopes].join(" "),
              },
            );
          }}
        />
        <Button
          size="xs"
          variant="default"
          onClick={() => {
            openContextModal({
              modal: "login",
              title: <Title order={3}>Login</Title>,
              size: "xl",
              centered: false,
              innerProps: {
                scopes: [...new Set([...missingScopes, ...grantedScopes])],
              },
            });
          }}
        >
          Customize
        </Button>
      </Group>
      <Title order={4} ta="center" mt="xl">
        Missing Scopes
      </Title>
      <ScopesTable scopes={missingScopes} />
      {(grantedScopes ?? []).length > 0 && (
        <>
          <Center>
            <Button
              color="dimmed"
              variant="subtle"
              onClick={toggleGrantedScopesTable}
            >
              Show already granted scopes
            </Button>
          </Center>
          <Collapse in={openGrantedScopesTable}>
            <ScopesTable scopes={grantedScopes ?? []} />
          </Collapse>
        </>
      )}
    </Container>
  );
}
