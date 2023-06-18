import React from "react";
import {
  createStyles,
  Group,
  Menu,
  Text,
  UnstyledButton,
  type UnstyledButtonProps,
} from "@mantine/core";
import {
  IconChevronRight,
  IconLogout,
  IconSettings,
  IconSwitchHorizontal,
} from "@tabler/icons-react";
import { signIn, signOut } from "next-auth/react";

import { useEsiClientContext } from "@jitaspace/esi-client";
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
          ? theme.colors.dark[8]
          : theme.colors.gray[0],
    },
  },
}));

interface UserButtonProps extends UnstyledButtonProps {
  icon?: React.ReactNode;
}

export default function UserButton({ icon, ...others }: UserButtonProps) {
  const { classes } = useStyles();
  const { characterId, characterName } = useEsiClientContext();

  return (
    <Menu
      withArrow
      width="target"
      position="bottom"
      transitionProps={{ transition: "pop" }}
    >
      <Menu.Target>
        <UnstyledButton className={classes.user} {...others}>
          <Group>
            <CharacterAvatar characterId={characterId} radius="xl" />

            <div style={{ flex: 1 }}>
              <Text size="sm" weight={500}>
                {characterName}
              </Text>
            </div>

            {icon || <IconChevronRight size={14} stroke={1.5} />}
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Settings</Menu.Label>
        <Menu.Item icon={<IconSettings size={14} stroke={1.5} />}>
          Settings
        </Menu.Item>
        <Menu.Item
          icon={<IconSwitchHorizontal size={14} stroke={1.5} />}
          onClick={() => {
            void signIn("eveonline");
          }}
        >
          Change Character
        </Menu.Item>
        <Menu.Item
          icon={<IconLogout size={14} stroke={1.5} />}
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
