import React from "react";
import {
  createStyles,
  Group,
  Menu,
  Text,
  UnstyledButton,
  type UnstyledButtonProps,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { signIn, signOut } from "next-auth/react";

import { useGetCharactersCharacterId } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import {
  CorporationIcon,
  RecruitmentIcon,
  TerminateIcon,
} from "@jitaspace/eve-icons";
import { CharacterAvatar } from "@jitaspace/ui";

import { env } from "~/env.mjs";

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
  const { data: character } = useGetCharactersCharacterId(
    characterId ?? 0,
    {},
    { swr: { enabled: !!characterId } },
  );

  const inSrpCorp =
    character?.data.corporation_id.toString() ===
    env.NEXT_PUBLIC_SRP_CORPORATION_ID;
  const isManager =
    inSrpCorp && scopes.includes("esi-characters.read_corporation_roles.v1");

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
        {inSrpCorp && !isManager && (
          <Menu.Item
            icon={<CorporationIcon width={20} />}
            onClick={() => {
              showNotification({
                message: "Log in as manager",
              });
              void signIn(
                "eveonline",
                {},
                {
                  scope: [
                    ...scopes,
                    "esi-characters.read_corporation_roles.v1",
                    "esi-wallet.read_corporation_wallets.v1",
                    "esi-ui.open_window.v1",
                  ].join(" "),
                },
              );
            }}
          >
            Log in as manager
          </Menu.Item>
        )}
        {isManager && (
          <Menu.Item
            icon={<CorporationIcon width={20} />}
            onClick={() => {
              showNotification({
                message: "Work in progress!",
              });
            }}
          >
            Administration
          </Menu.Item>
        )}
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
