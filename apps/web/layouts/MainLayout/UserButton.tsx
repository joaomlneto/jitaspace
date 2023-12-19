import React from "react";
import {
  createStyles,
  Group,
  Menu,
  Text,
  UnstyledButton,
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





const useStyles = createStyles((theme) => ({
  user: {
    display: "block",
    width: "100%",
    padding: theme.spacing.md,
    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.black,

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[6]
          : theme.colors.gray[0],
    },
  },
}));

interface UserButtonProps extends UnstyledButtonProps {
  icon?: React.ReactNode;
}

export default function UserButton({ ...others }: UserButtonProps) {
  const { classes } = useStyles();
  const character = useSelectedCharacter();
  const { characters, selectCharacter } = useAuthStore();

  if (!character) return "not logged in";

  const characterId = character.characterId;
  const characterName = character.accessTokenPayload.name;

  return (
    <Menu withArrow position="bottom" transitionProps={{ transition: "pop" }}>
      <Menu.Target>
        <UnstyledButton className={classes.user} {...others}>
          <Group>
            <CharacterAvatar characterId={characterId} radius="xl" size="sm" />

            <div style={{ flex: 1 }}>
              <Text size="sm" weight={500}>
                {characterName}
              </Text>
            </div>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {Object.keys(characters).length > 1 && (
          <>
            <Menu.Label>Switch Character</Menu.Label>
            {Object.values(characters)
              .filter((character) => character.characterId !== characterId)
              .map((character) => (
                <Menu.Item
                  icon={
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
        <Menu.Item icon={<SettingsIcon width={20} />} disabled>
          Settings
        </Menu.Item>
        <Menu.Item
          icon={<RecruitmentIcon width={20} />}
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
          icon={<TerminateIcon width={20} />}
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
