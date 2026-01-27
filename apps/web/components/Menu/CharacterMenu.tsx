import type { MenuProps } from "@mantine/core";
import { Menu, Text } from "@mantine/core";
import { modals, openContextModal } from "@mantine/modals";
import { IconLockSearch } from "@tabler/icons-react";

import { TerminateIcon } from "@jitaspace/eve-icons";
import {
  useAuthenticatedCharacter,
  useAuthStore,
  useCharacter,
} from "@jitaspace/hooks";
import { CharacterAvatar } from "@jitaspace/ui";

import { ZkillboardIcon } from "~/components/Icon";

export type CharacterMenuProps = MenuProps & {
  characterId: number;
};

export const CharacterMenu = ({
  characterId,
  children,
  ...otherProps
}: CharacterMenuProps) => {
  const { removeCharacter } = useAuthStore();
  const authenticatedCharacter = useAuthenticatedCharacter(characterId);
  const { data: character } = useCharacter(characterId);
  const isAuthenticated = authenticatedCharacter !== null;

  return (
    <Menu {...otherProps}>
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown>
        {false && <Menu.Item>Open</Menu.Item>}
        {false && <Menu.Divider />}
        <Menu.Label>View Character in…</Menu.Label>
        {false && <Menu.Item>EVE Online</Menu.Item>}
        <Menu.Item
          component="a"
          href={`https://evewho.com/character/${characterId}`}
          target="_blank"
          leftSection={<CharacterAvatar size={20} />}
        >
          EVE Who
        </Menu.Item>
        <Menu.Item
          component="a"
          href={`https://zkillboard.com/character/${characterId}`}
          target="_blank"
          leftSection={<ZkillboardIcon width={20} />}
        >
          zKillboard
        </Menu.Item>
        {authenticatedCharacter && isAuthenticated && (
          <>
            <Menu.Divider />
            <Menu.Label>Authentication</Menu.Label>

            <Menu.Item
              leftSection={<IconLockSearch size={20} />}
              onClick={() => {
                openContextModal({
                  modal: "ssoToken",
                  title: <Text fw={700}>{character?.name}</Text>,
                  size: "xl",
                  innerProps: {
                    characterId,
                  },
                });
              }}
            >
              Inspect Access Token
            </Menu.Item>

            <Menu.Item
              onClick={() =>
                modals.openConfirmModal({
                  title: `Log out ${authenticatedCharacter.accessTokenPayload.name}?`,
                  children: (
                    <Text size="sm">
                      Are you sure you want to log out from character{" "}
                      {authenticatedCharacter.accessTokenPayload.name}?
                    </Text>
                  ),
                  labels: { confirm: "Confirm", cancel: "Cancel" },
                  onConfirm: () => {
                    removeCharacter(characterId);
                  },
                })
              }
              color="red"
              leftSection={<TerminateIcon width={20} />}
            >
              Logout
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};
