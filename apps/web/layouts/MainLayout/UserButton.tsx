import React, { useMemo } from "react";
import {
  Group,
  Menu,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
  type UnstyledButtonProps,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { signOut } from "next-auth/react";

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
  const character = useSelectedCharacter();
  const { characters, selectCharacter } = useAuthStore();

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
            <CharacterAvatar characterId={characterId} radius="xl" size="sm" />

            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {characterName}
              </Text>
            </div>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {sortedCharacters.length > 1 && (
          <>
            <Menu.Label>Switch Character</Menu.Label>
            {sortedCharacters
              .filter((character) => character.characterId !== characterId)
              .map((character) => (
                <Menu.Item
                  leftSection={
                    <CharacterAvatar
                      characterId={character.characterId}
                      size={20}
                    />
                  }
                  onClick={() => selectCharacter(character.characterId)}
                >
                  {character.accessTokenPayload.name}
                </Menu.Item>
              ))}
            <Menu.Divider />
          </>
        )}
        <Menu.Item leftSection={<SettingsIcon width={20} />} disabled>
          Settings
        </Menu.Item>
        <Menu.Item
          leftSection={<RecruitmentIcon width={20} />}
          onClick={() => {
            openContextModal({
              modal: "login",
              title: "Login",
              size: "xl",
              innerProps: {},
            });
          }}
        >
          Add Character
        </Menu.Item>
        <Menu.Item
          leftSection={<TerminateIcon width={20} />}
          onClick={() => {
            void signOut({ callbackUrl: "/", redirect: true });
          }}
        >
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
