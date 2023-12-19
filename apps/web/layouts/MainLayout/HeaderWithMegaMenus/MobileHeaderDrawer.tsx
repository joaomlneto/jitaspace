import React, { memo } from "react";
import {
  Divider,
  Drawer,
  Group,
  Loader,
  rem,
  ScrollArea,
  Text,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";

import {
  CharacterSheetIcon,
  CorporationIcon,
  MapIcon,
} from "@jitaspace/eve-icons";
import { useAuthenticatedCharacterIds } from "@jitaspace/hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { characterApps, corporationApps, universeApps } from "~/config/apps";
import { MobileHeaderLinkGroup } from "~/layouts/MainLayout/HeaderWithMegaMenus/MobileHeaderLinkGroup";
import UserButton from "~/layouts/MainLayout/UserButton";
import { useStyles } from "./styles";


export type MobileHeaderDrawerProps = {
  opened: boolean;
  toggle: Function;
  close: Function;
};

export const MobileHeaderDrawer = memo(
  ({ opened, toggle, close }: MobileHeaderDrawerProps) => {
    const { classes, theme } = useStyles();
    const characterIds = useAuthenticatedCharacterIds();
    return (
      <>
        <Drawer
          opened={opened}
          onClose={() => close()}
          size="100%"
          p={0}
          title="Navigation"
          className={classes.hiddenDesktop}
          zIndex={1000000}
        >
          <ScrollArea h={`calc(100vh - ${rem(60)})`} mx="-md">
            <Divider
              my="sm"
              color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
            />

            <MobileHeaderLinkGroup
              title="Character Apps"
              Icon={(props) => <CharacterSheetIcon {...props} />}
              items={characterApps}
            />

            <MobileHeaderLinkGroup
              title="Corporation Apps"
              Icon={(props) => <CorporationIcon {...props} />}
              items={corporationApps}
            />

            <MobileHeaderLinkGroup
              title="Universe Apps"
              Icon={(props) => <MapIcon {...props} />}
              items={universeApps}
            />

            <Divider
              my="sm"
              color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
            />

            <Group position="center" grow pb="xl">
              {false && (
                <Group>
                  <Loader size="sm" />
                  <Text>Loading session…</Text>
                </Group>
              )}
              {characterIds.length > 0 && <UserButton />}
              {characterIds.length === 0 && (
                <LoginWithEveOnlineButton
                  size="small"
                  onClick={() => {
                    toggle();
                    openContextModal({
                      modal: "login",
                      title: "Login",
                      size: "xl",
                      innerProps: {},
                    });
                  }}
                />
              )}
            </Group>
          </ScrollArea>
        </Drawer>
      </>
    );
  },
);
