"use client";

import type { UnstyledButtonProps } from "@mantine/core";
import type React from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Group,
  Indicator,
  Menu,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { modals, openContextModal } from "@mantine/modals";

import {
  RecruitmentIcon,
  SettingsIcon,
  TerminateIcon,
} from "@jitaspace/eve-icons";
import { useAuthStore, useSelectedCharacter } from "@jitaspace/hooks";
import { CharacterAvatar } from "@jitaspace/ui";

interface UserButtonProps extends UnstyledButtonProps {
  icon?: React.ReactNode;
}

export default function UserButton({ ...others }: UserButtonProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const router = useRouter();
  const character = useSelectedCharacter();
  const { characters, selectCharacter, removeCharacter } = useAuthStore();

  const sortedCharacters = useMemo(
    () =>
      Object.values(characters).sort((a, b) =>
        a.accessTokenPayload.name.localeCompare(b.accessTokenPayload.name),
      ),
    [characters],
  );

  if (!character) return "not logged in";

  const characterId = character.characterId;
  const characterName = character.accessTokenPayload.name;

  // Re-authentication uses the same EVE SSO login flow as adding a character;
  // logging in again with an expired character refreshes its tokens and clears
  // the `sessionExpired` flag.
  const openLoginModal = () =>
    openContextModal({
      modal: "login",
      title: "Login",
      size: "xl",
      innerProps: {},
    });

  return (
    <Menu withArrow position="bottom" transitionProps={{ transition: "pop" }}>
      <Menu.Target>
        <UnstyledButton
          style={{
            display: "block",
            width: "100%",
            padding: theme.spacing.md,
            color: colorScheme === "dark" ? theme.colors.dark[0] : theme.black,

            "&:hover": {
              backgroundColor:
                colorScheme === "dark"
                  ? theme.colors.dark[6]
                  : theme.colors.gray[0],
            },
          }}
          {...others}
        >
          <Group>
            <Indicator
              inline
              disabled={!character.sessionExpired}
              color="red"
              size={12}
              offset={4}
              withBorder
            >
              <CharacterAvatar
                characterId={characterId}
                radius="xl"
                size="sm"
              />
            </Indicator>

            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {characterName}
              </Text>
              {character.sessionExpired && (
                <Text size="xs" c="red">
                  Session expired
                </Text>
              )}
            </div>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {character.sessionExpired && (
          <>
            <Menu.Label c="red">Session expired</Menu.Label>
            <Menu.Item
              color="red"
              leftSection={<RecruitmentIcon width={20} />}
              onClick={openLoginModal}
            >
              Sign in again
            </Menu.Item>
            <Menu.Divider />
          </>
        )}
        {sortedCharacters.length > 1 && (
          <>
            <Menu.Label>Switch Character</Menu.Label>
            {sortedCharacters
              .filter((character) => character.characterId !== characterId)
              .map((character) => (
                <Menu.Item
                  key={character.characterId}
                  leftSection={
                    <Indicator
                      inline
                      disabled={!character.sessionExpired}
                      color="red"
                      size={8}
                      offset={2}
                      withBorder
                    >
                      <CharacterAvatar
                        characterId={character.characterId}
                        size={20}
                      />
                    </Indicator>
                  }
                  rightSection={
                    character.sessionExpired ? (
                      <Text size="xs" c="red">
                        expired
                      </Text>
                    ) : undefined
                  }
                  onClick={() =>
                    character.sessionExpired
                      ? openLoginModal()
                      : selectCharacter(character.characterId)
                  }
                >
                  {character.accessTokenPayload.name}
                </Menu.Item>
              ))}
            <Menu.Divider />
          </>
        )}
        <Menu.Item
          leftSection={<SettingsIcon width={20} />}
          onClick={() => {
            openContextModal({
              modal: "settings",
              title: "Settings",
              size: "xl",
              innerProps: {},
            });
          }}
        >
          Settings
        </Menu.Item>
        <Menu.Item
          leftSection={<RecruitmentIcon width={20} />}
          onClick={openLoginModal}
        >
          Add Character
        </Menu.Item>
        <Menu.Item
          leftSection={<TerminateIcon width={20} />}
          onClick={() =>
            modals.openConfirmModal({
              title: `Log out ${characterName}?`,
              children: (
                <Text size="sm">
                  Are you sure you want to log out from character{" "}
                  {characterName}?
                </Text>
              ),
              labels: { confirm: "Confirm", cancel: "Cancel" },
              confirmProps: { color: "red" },
              onConfirm: () => {
                removeCharacter(characterId);
                // If that was the last character we're fully logged out, so
                // go home. Otherwise removeCharacter() selects one of the
                // remaining characters and we stay on the current page.
                if (sortedCharacters.length <= 1) {
                  router.push("/");
                }
              },
            })
          }
        >
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
