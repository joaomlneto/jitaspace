import React from "react";
import {
  Button,
  Center,
  Collapse,
  Container,
  createStyles,
  Group,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { openContextModal } from "@mantine/modals";
import { signIn } from "next-auth/react";

import { useEsiClientContext, type ESIScope } from "@jitaspace/esi-client";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { ScopesTable } from "./ScopesTable";

const useStyles = createStyles((theme) => ({
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
      theme.colorScheme === "dark"
        ? theme.colors.dark[4]
        : theme.colors.gray[2],

    [theme.fn.smallerThan("sm")]: {
      fontSize: 120,
    },
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    textAlign: "center",
    fontWeight: 900,
    fontSize: 38,

    [theme.fn.smallerThan("sm")]: {
      fontSize: 32,
    },
  },

  description: {
    maxWidth: 600,
    margin: "auto",
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
}));

export type RequestPermissionsBannerProps = {
  requiredScopes: ESIScope[];
};

export function RequestPermissionsBanner({
  requiredScopes,
}: RequestPermissionsBannerProps) {
  const { classes } = useStyles();
  const { scopes: grantedScopes } = useEsiClientContext();

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
        align="center"
        className={classes.description}
      >
        We must request additional scopes to continue.
        <br />
        Click the login button to request them.
        <br />
        Alternatively, click the customize button to control which scopes are
        requested.
      </Text>
      <Group spacing="md" position="center">
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
      <Title order={4} align="center" mt="xl">
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
