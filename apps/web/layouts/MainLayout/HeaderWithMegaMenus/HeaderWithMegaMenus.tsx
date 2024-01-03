import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Box,
  Burger,
  Center,
  Container,
  Group,
  Header,
  Loader,
  rem,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
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
import { MobileHeaderDrawer } from "./MobileHeaderDrawer";
import { useStyles } from "./styles";

export function HeaderWithMegaMenus() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const { classes } = useStyles();
  const characterIds = useAuthenticatedCharacterIds();
  const pinned = useHeadroom({
    fixedAt: 120,
    onRelease: () => {
      closeDrawer();
    },
  });

  return (
    <Box pb="xs">
      <Header
        height={60}
        px="md"
        sx={{
          transform: `translate3d(0, ${pinned ? 0 : rem(-110)}, 0)`,
          transition: "transform 400ms ease",
        }}
      >
        <Container size="xl" h={60} p={0}>
          <Group position="apart" h="100%" gap="xs">
            <Link href="/" className={classes.link}>
              <Group>
                <Image src="/logo.png" alt="Jita logo" width={30} height={30} />
              </Group>
            </Link>

            <Group
              sx={{ height: "100%" }}
              spacing={0}
              className={classes.hiddenMobile}
            >
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
                    <Group spacing="xs">
                      <PeopleAndPlacesIcon width={32} />
                    </Group>
                  </Box>
                </Center>
              </UnstyledButton>
            </Group>

            <Group className={classes.hiddenMobile}>
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
              className={classes.hiddenDesktop}
            />
          </Group>
        </Container>
      </Header>

      <MobileHeaderDrawer
        opened={drawerOpened}
        toggle={toggleDrawer}
        close={closeDrawer}
      />
    </Box>
  );
}
