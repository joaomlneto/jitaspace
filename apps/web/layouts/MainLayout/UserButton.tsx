"use client";

import type { UnstyledButtonProps } from "@mantine/core";
import type React from "react";
import {
  Group,
  Indicator,
  Menu,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

import {
  RecruitmentIcon,
  SettingsIcon,
  TerminateIcon,
} from "@jitaspace/eve-icons";
import { CharacterAvatar } from "@jitaspace/ui";

import { useAccountActions } from "./useAccountActions";

interface UserButtonProps extends UnstyledButtonProps {
  icon?: React.ReactNode;
  /**
   * Render only the character's avatar, for the narrow phone header where the
   * name doesn't fit. The dropdown is the same either way.
   */
  compact?: boolean;
}

export default function UserButton({ compact, ...others }: UserButtonProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const {
    character,
    otherCharacters,
    openLoginModal,
    openSettingsModal,
    switchToCharacter,
    confirmLogout,
  } = useAccountActions();

  if (!character) return "not logged in";

  const characterId = character.characterId;
  const characterName = character.accessTokenPayload.name;

  const avatar = (
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
        size={compact ? 32 : "sm"}
      />
    </Indicator>
  );

  return (
    <Menu
      withArrow
      position={compact ? "bottom-end" : "bottom"}
      transitionProps={{ transition: "pop" }}
    >
      <Menu.Target>
        {compact ? (
          <UnstyledButton
            aria-label={`Character menu for ${characterName}`}
            style={{ display: "flex", alignItems: "center", padding: 4 }}
            {...others}
          >
            {avatar}
          </UnstyledButton>
        ) : (
          <UnstyledButton
            style={{
              display: "block",
              width: "100%",
              padding: theme.spacing.md,
              color:
                colorScheme === "dark" ? theme.colors.dark[0] : theme.black,
            }}
            {...others}
          >
            <Group>
              {avatar}
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
        )}
      </Menu.Target>
      <Menu.Dropdown>
        {compact && (
          <>
            <Menu.Label>{characterName}</Menu.Label>
            <Menu.Divider />
          </>
        )}
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
        {otherCharacters.length > 0 && (
          <>
            <Menu.Label>Switch Character</Menu.Label>
            {otherCharacters.map((other) => (
              <Menu.Item
                key={other.characterId}
                leftSection={
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
                      size={20}
                    />
                  </Indicator>
                }
                rightSection={
                  other.sessionExpired ? (
                    <Text size="xs" c="red">
                      expired
                    </Text>
                  ) : undefined
                }
                onClick={() => switchToCharacter(other)}
              >
                {other.accessTokenPayload.name}
              </Menu.Item>
            ))}
            <Menu.Divider />
          </>
        )}
        <Menu.Item
          leftSection={<SettingsIcon width={20} />}
          onClick={openSettingsModal}
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
          onClick={confirmLogout}
        >
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
