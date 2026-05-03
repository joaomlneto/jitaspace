import type { MenuProps } from "@mantine/core";
import Link from "next/link";
import { Menu } from "@mantine/core";

import type { ESIScope } from "@jitaspace/esi-metadata";
import { useAuthStore } from "@jitaspace/hooks";
import { CharacterAvatar } from "@jitaspace/ui";

import { ZkillboardIcon } from "~/components/Icon";
import { allianceApps } from "~/config/apps";
import { getEnabledApps } from "./appAccess";

export const getEnabledAllianceApps = (grantedScopes: ESIScope[]) => {
  return getEnabledApps(allianceApps, grantedScopes);
};

export type AllianceMenuProps = MenuProps & {
  allianceId: number;
};

export const AllianceMenu = ({
  allianceId,
  children,
  ...otherProps
}: AllianceMenuProps) => {
  const grantedScopes = useAuthStore((state) => {
    return Array.from(
      new Set(
        Object.values(state.characters)
          .filter((character) => character.allianceId === allianceId)
          .flatMap((character) => character.accessTokenPayload.scp),
      ),
    );
  });

  const enabledAllianceApps = getEnabledAllianceApps(grantedScopes);

  return (
    <Menu {...otherProps}>
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>View Alliance in…</Menu.Label>
        <Menu.Item
          component="a"
          href={`https://evewho.com/alliance/${allianceId}`}
          target="_blank"
          leftSection={<CharacterAvatar size={20} />}
        >
          EVE Who
        </Menu.Item>
        <Menu.Item
          component="a"
          href={`https://zkillboard.com/alliance/${allianceId}`}
          target="_blank"
          leftSection={<ZkillboardIcon width={20} />}
        >
          zKillboard
        </Menu.Item>
        {enabledAllianceApps.length > 0 && (
          <>
            <Menu.Divider />
            <Menu.Label>Alliance Apps</Menu.Label>
            {enabledAllianceApps.map((app) => (
              <Menu.Item
                key={app.name}
                component={Link}
                href={app.url ?? ""}
                onClick={app.onClick}
                leftSection={<app.Icon width={20} />}
              >
                {app.name}
              </Menu.Item>
            ))}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};
