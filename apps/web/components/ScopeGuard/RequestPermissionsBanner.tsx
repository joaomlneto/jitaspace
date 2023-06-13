import React from "react";
import {
  Button,
  Center,
  Collapse,
  Container,
  createStyles,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { signIn } from "next-auth/react";

import { type ESIScope } from "@jitaspace/esi-client";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { useTokenScopes } from "~/hooks";
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
  const { grantedScopes } = useTokenScopes();

  const [openGrantedScopesTable, { toggle: toggleGrantedScopesTable }] =
    useDisclosure(false);

  const missingScopes = requiredScopes.filter(
    (scope) => !(grantedScopes ?? []).includes(scope),
  );

  return (
    <Container className={classes.root}>
      <Title className={classes.title}>Additional Permissions Required</Title>
      <Text
        color="dimmed"
        size="lg"
        align="center"
        className={classes.description}
      >
        We must request additional scopes to continue.
        <br />
        To continue, please sign in again with elevated permissions.
      </Text>
      <Center>
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
      </Center>
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
