import React from "react";
import {
  Button,
  Center,
  Collapse,
  Container,
  Group,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { openContextModal } from "@mantine/modals";
import { signIn } from "next-auth/react";

import { type ESIScope } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { ScopesTable } from "./ScopesTable";

export type RequestPermissionsBannerProps = {
  requiredScopes: ESIScope[];
};

export function RequestPermissionsBanner({
  requiredScopes,
}: RequestPermissionsBannerProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const classes = {
    root: {
      paddingTop: 80,
      paddingBottom: 80,
    },

    label: {
      textAlign: "center",
      fontWeight: 900,
      fontSize: 220,
      lineHeight: 1,
      marginBottom: theme.spacing.xl,
      color:
        colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[2],

      // FIXME MANTINE V7 MIGRATION
      /*
      [theme.fn.smallerThan("sm")]: {
        fontSize: 120,
      },*/
    },

    title: {
      fontFamily: `Greycliff CF, ${theme.fontFamily}`,

      // FIXME MANTINE V7 MIGRATION
      /*
      [theme.fn.smallerThan("sm")]: {
        fontSize: 32,
      },*/
    },

    description: {
      maxWidth: 600,
      margin: "auto",
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
  };

  const { scopes: grantedScopes } = useEsiClientContext();

  const [openGrantedScopesTable, { toggle: toggleGrantedScopesTable }] =
    useDisclosure(false);

  const missingScopes = requiredScopes.filter(
    (scope) => !(grantedScopes ?? []).includes(scope),
  );

  return (
    <Container style={classes.root}>
      <Title fw={900} fz={38} ta="center" style={classes.title}>
        Insufficient Scopes
      </Title>
      <Text c="dimmed" size="md" ta="center" style={classes.description}>
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
