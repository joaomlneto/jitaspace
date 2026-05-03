import type { MenuProps } from "@mantine/core";
import Link from "next/link";
import { Menu } from "@mantine/core";

import type { ESIScope } from "@jitaspace/esi-metadata";
import { useAuthStore } from "@jitaspace/hooks";
import { CharacterAvatar } from "@jitaspace/ui";

import { JitaSpaceIcon, ZkillboardIcon } from "~/components/Icon";
import { CorporationPageLink } from "~/components/Link";
import { corporationApps } from "~/config/apps";
import { getEnabledApps } from "./appAccess";

export const getEnabledCorporationApps = (grantedScopes: ESIScope[]) => {
  return getEnabledApps(corporationApps, grantedScopes);
};

export type CorporationMenuProps = MenuProps & {
  corporationId: number;
};

export const CorporationMenu = ({
  corporationId,
  children,
  ...otherProps
}: CorporationMenuProps) => {
  const grantedScopes = useAuthStore((state) => {
    return Array.from(
      new Set(
        Object.values(state.characters)
          .filter((character) => character.corporationId === corporationId)
          .flatMap((character) => character.accessTokenPayload.scp),
      ),
    );
  });

  const enabledCorporationApps = getEnabledCorporationApps(grantedScopes);

  return (
    <Menu {...otherProps}>
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>View Corporation in…</Menu.Label>
        <Menu.Item
          component={CorporationPageLink}
          corporationId={corporationId}
          leftSection={<JitaSpaceIcon width={20} />}
        >
          JitaSpace
        </Menu.Item>
        <Menu.Item
          component="a"
          href={`https://evewho.com/corporation/${corporationId}`}
          target="_blank"
          leftSection={<CharacterAvatar size={20} />}
        >
          EVE Who
        </Menu.Item>
        <Menu.Item
          component="a"
          href={`https://zkillboard.com/corporation/${corporationId}`}
          target="_blank"
          leftSection={<ZkillboardIcon width={20} />}
        >
          zKillboard
        </Menu.Item>
        {enabledCorporationApps.length > 0 && (
          <>
            <Menu.Divider />
            <Menu.Label>Corporation Apps</Menu.Label>
            {enabledCorporationApps.map((app) => (
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
