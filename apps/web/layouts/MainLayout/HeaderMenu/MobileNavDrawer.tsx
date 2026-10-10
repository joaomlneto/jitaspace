"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Box,
  Divider,
  Drawer,
  Group,
  Indicator,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { openSpotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";

import {
  RecruitmentIcon,
  SettingsIcon,
  TerminateIcon,
} from "@jitaspace/eve-icons";
import { CharacterAvatar, LoginWithEveOnlineButton } from "@jitaspace/ui";

import { jitaApps } from "~/config/apps";
import { useAccountActions } from "~/layouts/MainLayout/useAccountActions";
import classes from "./HeaderMenu.module.css";

export interface MobileNavDrawerProps {
  opened: boolean;
  close: () => void;
}

type AccountActions = ReturnType<typeof useAccountActions>;

/**
 * The signed-in character, the others to switch to, and the account actions,
 * laid out inline rather than behind a dropdown: a popover nested in a
 * full-screen drawer is cramped on a phone and easy to lose behind it. It sits
 * after the navigation, since the header avatar is the quick way in. Every
 * action closes the drawer first, so the modal it opens is never covered.
 */
function DrawerAccountSection({
  actions,
  close,
}: Readonly<{ actions: AccountActions; close: () => void }>) {
  const {
    character,
    otherCharacters,
    openLoginModal,
    openSettingsModal,
    switchToCharacter,
    confirmLogout,
  } = actions;

  if (!character) return null;

  const closeThen = (action: () => void) => () => {
    close();
    action();
  };

  return (
    <Stack gap={2}>
      <Group gap="sm" px="md" py="xs" wrap="nowrap">
        <Indicator
          inline
          disabled={!character.sessionExpired}
          color="red"
          size={12}
          offset={2}
          withBorder
        >
          <CharacterAvatar characterId={character.characterId} size="md" />
        </Indicator>
        <div style={{ minWidth: 0 }}>
          <Text fw={600} size="sm" truncate>
            {character.accessTokenPayload.name}
          </Text>
          {character.sessionExpired && (
            <Text size="xs" c="red">
              Session expired
            </Text>
          )}
        </div>
      </Group>

      {character.sessionExpired && (
        <UnstyledButton
          className={classes.link}
          c="red"
          onClick={closeThen(openLoginModal)}
        >
          <Group gap="sm" wrap="nowrap">
            <RecruitmentIcon width={24} />
            <Text size="sm">Sign in again</Text>
          </Group>
        </UnstyledButton>
      )}

      {otherCharacters.length > 0 && (
        <>
          <Text size="xs" c="dimmed" fw={600} px="md" pt="xs">
            Switch Character
          </Text>
          {otherCharacters.map((other) => (
            <UnstyledButton
              key={other.characterId}
              className={classes.link}
              onClick={closeThen(() => switchToCharacter(other))}
            >
              <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <Indicator
                  inline
                  disabled={!other.sessionExpired}
                  color="red"
                  size={8}
                  offset={1}
                  withBorder
                >
                  <CharacterAvatar characterId={other.characterId} size={24} />
                </Indicator>
                <Text size="sm" truncate style={{ flex: 1 }}>
                  {other.accessTokenPayload.name}
                </Text>
                {other.sessionExpired && (
                  <Text size="xs" c="red">
                    expired
                  </Text>
                )}
              </Group>
            </UnstyledButton>
          ))}
          <Divider my={4} />
        </>
      )}

      <UnstyledButton
        className={classes.link}
        onClick={closeThen(openSettingsModal)}
      >
        <Group gap="sm" wrap="nowrap">
          <SettingsIcon width={24} />
          <Text size="sm">Settings</Text>
        </Group>
      </UnstyledButton>
      <UnstyledButton
        className={classes.link}
        onClick={closeThen(openLoginModal)}
      >
        <Group gap="sm" wrap="nowrap">
          <RecruitmentIcon width={24} />
          <Text size="sm">Add Character</Text>
        </Group>
      </UnstyledButton>
      <UnstyledButton
        className={classes.link}
        onClick={closeThen(confirmLogout)}
      >
        <Group gap="sm" wrap="nowrap">
          <TerminateIcon width={24} />
          <Text size="sm">Logout</Text>
        </Group>
      </UnstyledButton>
    </Stack>
  );
}

/**
 * Full-screen navigation for phones (below the `sm` breakpoint, where the
 * desktop bar is hidden). Opens with the search box (and, when signed out, the
 * login button, which has no other home on a phone), mirrors the desktop groups
 * as flat, always-expanded sections, and ends with the account section.
 */
export const MobileNavDrawer = memo(
  ({ opened, close }: MobileNavDrawerProps) => {
    const actions = useAccountActions();

    return (
      <Drawer
        opened={opened}
        onClose={close}
        size="100%"
        padding="md"
        title="Navigation"
        hiddenFrom="sm"
        styles={{
          body: {
            paddingLeft: 0,
            paddingRight: 0,
            paddingBottom:
              "calc(var(--mantine-spacing-xl) + env(safe-area-inset-bottom))",
          },
        }}
      >
        <Box px="md" mb="sm">
          <UnstyledButton
            className={classes.search}
            w="100%"
            onClick={() => {
              close();
              openSpotlight();
            }}
            aria-label="Search New Eden"
          >
            <IconSearch size={16} stroke={1.5} />
            <Text className={classes.searchLabel} size="sm" c="dimmed">
              Search New Eden…
            </Text>
          </UnstyledButton>
        </Box>

        {!actions.character && (
          <Group justify="center" px="md" mb="sm">
            <LoginWithEveOnlineButton
              size="small"
              onClick={() => {
                close();
                actions.openLoginModal();
              }}
            />
          </Group>
        )}

        <Divider mb="sm" />

        {Object.values(jitaApps).map((group) => (
          <Stack gap={2} key={group.name} mb="sm">
            <Group gap="xs" px="md" py={4}>
              <group.Icon width={20} />
              <Text fw={600} size="sm">
                {group.name}
              </Text>
            </Group>
            {Object.entries(group.apps).map(([key, app]) => (
              <UnstyledButton
                key={key}
                component={Link}
                href={app.url ?? "#"}
                className={classes.link}
                onClick={close}
              >
                <Group gap="sm" wrap="nowrap">
                  <app.Icon width={24} />
                  <Text size="sm">{app.name}</Text>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        ))}

        {actions.character && (
          <>
            <Divider mb="sm" />
            <DrawerAccountSection actions={actions} close={close} />
          </>
        )}
      </Drawer>
    );
  },
);
MobileNavDrawer.displayName = "MobileNavDrawer";
