import React from "react";
import {
  Group,
  Menu,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
  type UnstyledButtonProps,
} from "@mantine/core";
import { signIn, signOut } from "next-auth/react";

import { useEsiClientContext } from "@jitaspace/esi-hooks";
import {
  RecruitmentIcon,
  SettingsIcon,
  TerminateIcon,
} from "@jitaspace/eve-icons";
import { CharacterAvatar } from "@jitaspace/ui";

interface UserButtonProps extends UnstyledButtonProps {
  icon?: React.ReactNode;
}

export default function UserButton({ ...others }: UserButtonProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const classes = {
    user: {
      display: "block",
      width: "100%",
      padding: theme.spacing.md,
      color: colorScheme === "dark" ? theme.colors.dark[0] : theme.black,

      "&:hover": {
        backgroundColor:
          colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
      },
    },
  };
  const { characterId, characterName, scopes } = useEsiClientContext();

  return (
    <Menu withArrow position="bottom" transitionProps={{ transition: "pop" }}>
      <Menu.Target>
        <UnstyledButton style={classes.user} {...others}>
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
        <Menu.Item leftSection={<SettingsIcon width={20} />} disabled>
          Settings
        </Menu.Item>
        <Menu.Item
          leftSection={<RecruitmentIcon width={20} />}
          onClick={() => {
            void signIn("eveonline", {}, { scope: scopes.join(" ") });
          }}
        >
          Switch Character
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
