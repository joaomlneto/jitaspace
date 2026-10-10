"use client";

import { memo } from "react";
import Link from "next/link";
import {
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

/**
 * The signed-in character, the others to switch to, and the account actions,
 * laid out inline rather than behind a dropdown: a popover nested in a
 * full-screen drawer is cramped on a phone and easy to lose behind it. Every
 * action closes the drawer first, so the modal it opens is never covered.
 */
function DrawerAccountSection({ close }: { close: () => void }) {
  const {
    character,
    otherCharacters,
    openLoginModal,
    openSettingsModal,
    switchToCharacter,
    confirmLogout,
  } = useAccountActions();

  const then = (action: () => void) => () => {
    close();
    action();
  };

  if (!character) {
    return (
      <Group justify="center" px="md">
        <LoginWithEveOnlineButton size="small" onClick={then(openLoginModal)} />
      </Group>
    );
  }

  return (
    <Stack gap={2}>
      <Group gap="sm" px="md" py="xs" wrap="nowrap">
        <Indicator
          inline
          disabled={!character.sessionExpired}
          color="red"
          size={12}
          offset={4}
          withBorder
        >
          <CharacterAvatar
            characterId={character.characterId}
            radius="xl"
            size="md"
          />
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
          onClick={then(openLoginModal)}
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
              onClick={then(() => switchToCharacter(other))}
            >
              <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <Indicator
                  inline
                  disabled={!other.sessionExpired}
                  color="red"
                  size={8}
                  offset={2}
                  withBorder
                >
                  <CharacterAvatar
                    characterId={other.characterId}
                    radius="xl"
                    size={24}
                  />
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
        onClick={then(openSettingsModal)}
      >
        <Group gap="sm" wrap="nowrap">
          <SettingsIcon width={24} />
          <Text size="sm">Settings</Text>
        </Group>
      </UnstyledButton>
      <UnstyledButton className={classes.link} onClick={then(openLoginModal)}>
        <Group gap="sm" wrap="nowrap">
          <RecruitmentIcon width={24} />
          <Text size="sm">Add Character</Text>
        </Group>
      </UnstyledButton>
      <UnstyledButton className={classes.link} onClick={then(confirmLogout)}>
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
 * desktop bar is hidden). Opens with the search box and the account section,
 * then mirrors the desktop groups as flat, always-expanded sections.
 */
export const MobileNavDrawer = memo(
  ({ opened, close }: MobileNavDrawerProps) => (
    <Drawer
      opened={opened}
      onClose={close}
      size="100%"
      padding="md"
      title="Navigation"
      hiddenFrom="sm"
      styles={{ body: { paddingLeft: 0, paddingRight: 0 } }}
    >
      <UnstyledButton
        className={classes.search}
        mx="md"
        mb="sm"
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

      <DrawerAccountSection close={close} />

      <Divider my="sm" />

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
    </Drawer>
  ),
);
MobileNavDrawer.displayName = "MobileNavDrawer";
