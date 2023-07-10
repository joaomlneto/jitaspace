import React, { useState } from "react";
import {
  Button,
  Center,
  Collapse,
  Container,
  Group,
  SimpleGrid,
  Switch,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { type ContextModalProps } from "@mantine/modals";
import { signIn } from "next-auth/react";

import { type ESIScope } from "@jitaspace/esi-client";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import {
  AppCheckboxCard,
  AppScopeSetCheckboxCard,
  ScopesTable,
} from "~/components/ScopeGuard";
import { extraJitaFeatures, jitaApps } from "~/config/apps";

const allAppScopes = [
  ...Object.values(jitaApps).flatMap((app) =>
    [...(app.scopes.required ?? []), ...(app.scopes.optional ?? [])].flatMap(
      (s) => s.scopes,
    ),
  ),
  ...extraJitaFeatures.flatMap((f) => f.scopes),
];

export function LoginModal({
  innerProps,
}: ContextModalProps<{ scopes?: ESIScope[] }>) {
  const [showAppSelector, { toggle: toggleAppSelector }] = useDisclosure(false);
  const [showScopesTable, { toggle }] = useDisclosure(false);
  const [showAppScopeDetails, { toggle: toggleAppScopeDetails }] =
    useDisclosure(false);
  const [selectedScopes, setSelectedScopes] = useState<Set<ESIScope>>(
    new Set(innerProps.scopes ?? allAppScopes),
  );

  const addScopes = (newScopes: ESIScope[]) => {
    setSelectedScopes(new Set([...selectedScopes, ...newScopes]));
  };

  const removeScopes = (newScopes: ESIScope[]) => {
    setSelectedScopes(
      new Set([...selectedScopes].filter((s) => !newScopes.includes(s))),
    );
  };
  return (
    <Container p={0}>
      {!showAppSelector && (
        <>
          <Text size="sm" color="dimmed">
            Click to log in with all required scopes to use all of the features
            on the website.
          </Text>
          <Center my="xl">
            <LoginWithEveOnlineButton
              size="small"
              onClick={() => {
                void signIn(
                  "eveonline",
                  {},
                  {
                    scope: [...selectedScopes].join(" "),
                  },
                );
              }}
            />
          </Center>
          <Group spacing="xs" position="center" my="xl">
            <Button size="xs" variant="default" onClick={toggleAppSelector}>
              Customize
            </Button>
            <Button size="xs" variant="default" onClick={toggle}>
              Show scopes to be requested
            </Button>
          </Group>
        </>
      )}

      {showAppSelector && (
        <>
          <Text size="sm" color="dimmed">
            Select which features you would like to enable and click the login
            button.
          </Text>
          <Switch
            my="md"
            label="Advanced mode"
            checked={showAppScopeDetails}
            onChange={() => toggleAppScopeDetails()}
          />
          <SimpleGrid
            cols={2}
            my="xl"
            spacing={0}
            breakpoints={[{ maxWidth: "sm", cols: 1 }]}
          >
            {[...Object.values(jitaApps)].map((feature) => (
              <AppCheckboxCard
                app={feature}
                selectedScopes={[...selectedScopes]}
                onScopeSelect={addScopes}
                onScopeDeselect={removeScopes}
                key={feature.name}
                showScopeDetails={showAppScopeDetails}
              />
            ))}
            {extraJitaFeatures.map((feature) => (
              <Container m={0} p={0} key={feature.reason}>
                <Container m={0} p={0} key={feature.reason}>
                  <AppScopeSetCheckboxCard
                    selectedScopes={[...selectedScopes]}
                    onScopeSelect={addScopes}
                    onScopeDeselect={removeScopes}
                    scopeSet={feature}
                  />
                </Container>
              </Container>
            ))}
          </SimpleGrid>

          <Center my="xl">
            <LoginWithEveOnlineButton
              size="small"
              onClick={() => {
                void signIn(
                  "eveonline",
                  {},
                  {
                    scope: [...selectedScopes].join(" "),
                  },
                );
              }}
            />
          </Center>

          <Center>
            <Button size="xs" variant="default" onClick={toggle}>
              Show scopes to be requested
            </Button>
          </Center>
        </>
      )}
      <Collapse in={showScopesTable}>
        <Text size="sm" color="dimmed">
          List of scopes to be requested:
        </Text>
        <ScopesTable scopes={[...selectedScopes]} showRawScopeNames />
      </Collapse>
    </Container>
  );
}
