import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Box,
  Burger,
  Center,
  Container,
  Group,
  Loader,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { openContextModal } from "@mantine/modals";
import { openSpotlight } from "@mantine/spotlight";

import {
  AlliancesIcon,
  CharacterSheetIcon,
  CorporationIcon,
  MapIcon,
  PeopleAndPlacesIcon,
} from "@jitaspace/eve-icons";
import { useAuthenticatedCharacterIds } from "@jitaspace/hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import {
  allianceApps,
  characterApps,
  corporationApps,
  universeApps,
} from "~/config/apps";
import { DesktopHeaderLinkGroup } from "~/layouts/MainLayout/HeaderWithMegaMenus/DesktopHeaderLinkGroup";
import UserButton from "../UserButton";
import classes from "./HeaderWithMegaMenus.module.css";
import { MobileHeaderDrawer } from "./MobileHeaderDrawer";

export type HeaderWithMegaMenusProps = {
  pinned: boolean;
};

export function HeaderWithMegaMenus({ pinned }: HeaderWithMegaMenusProps) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const characterIds = useAuthenticatedCharacterIds();
  /*const pinned = useHeadroom({
    fixedAt: 120,
    onRelease: () => {
      closeDrawer();
    },
  });*/
  const theme = useMantineTheme();

  return (
    <Box h="100%" px="md">
      <div
        className={classes.header}
        style={
          {
            //transform: `translate3d(0, ${pinned ? 0 : rem(-60)}, 0)`,
            //transition: "transform 400ms ease",
          }
        }
      >
        <Container size="xl" h={60} p={0}>
          <Group justify="space-between" h="100%" gap="xs">
            <Group h="100%">
              <Link href="/" className={classes.link}>
                <Image src="/logo.png" alt="Jita logo" width={30} height={30} />
              </Link>
            </Group>

            <Group h="100%" gap={0} visibleFrom="sm">
              <DesktopHeaderLinkGroup
                title="Character Tools"
                Icon={(props) => <CharacterSheetIcon {...props} />}
                items={characterApps}
              />
              <DesktopHeaderLinkGroup
                title="Corporation Tools"
                Icon={(props) => <CorporationIcon {...props} />}
                items={corporationApps}
              />
              <DesktopHeaderLinkGroup
                title="Alliance Tools"
                Icon={(props) => <AlliancesIcon {...props} />}
                items={allianceApps}
              />
              <DesktopHeaderLinkGroup
                title="Universe Explorer"
                Icon={(props) => <MapIcon {...props} />}
                items={universeApps}
              />

              <UnstyledButton
                className={classes.link}
                onClick={() => {
                  openSpotlight();
                }}
              >
                <Center inline>
                  <Box component="span">
                    <Group gap="xs">
                      <PeopleAndPlacesIcon width={32} />
                    </Group>
                  </Box>
                </Center>
              </UnstyledButton>
            </Group>

            <Group visibleFrom="sm">
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
                    openContextModal({
                      modal: "login",
                      title: <Title order={3}>Login</Title>,
                      size: "xl",
                      centered: false,
                      innerProps: {},
                    });
                  }}
                />
              )}
            </Group>

            <Burger
              opened={drawerOpened}
              onClick={toggleDrawer}
              hiddenFrom="sm"
            />
          </Group>
        </Container>
      </div>
      <MobileHeaderDrawer
        opened={drawerOpened}
        toggle={toggleDrawer}
        close={closeDrawer}
      />
    </Box>
  );
}
