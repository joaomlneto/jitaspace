import React from "react";
import {
  createStyles,
  Group,
  Menu,
  Text,
  UnstyledButton,
  type UnstyledButtonProps,
} from "@mantine/core";
import { signIn, signOut } from "next-auth/react";

import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { RecruitmentIcon, TerminateIcon } from "@jitaspace/eve-icons";
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
  const { characterId, characterName, scopes } = useEsiClientContext();

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
        <Menu.Item
          icon={<RecruitmentIcon width={20} />}
          onClick={() => {
            void signIn("eveonline", {}, { scope: scopes.join(" ") });
          }}
        >
          Switch Character
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