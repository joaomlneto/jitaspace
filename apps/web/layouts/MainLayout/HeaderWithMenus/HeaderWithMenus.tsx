"use client";

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

import { ServerStatusIndicator } from "~/components/ServerStatus/ServerStatusIndicator";
import {
  allianceApps,
  characterApps,
  corporationApps,
  universeApps,
} from "~/config/apps";
import { MobileHeaderDrawer } from "../HeaderWithMegaMenus/MobileHeaderDrawer";
import UserButton from "../UserButton";
import { DesktopHeaderLinkGroup } from "./DesktopHeaderLinkGroup";
import classes from "./HeaderWithMenus.module.css";

export interface HeaderWithMenusProps {
  pinned: boolean;
}

export function HeaderWithMenus({ pinned: _pinned }: HeaderWithMenusProps) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const characterIds = useAuthenticatedCharacterIds();
  const _theme = useMantineTheme();

  return (
    <Box h="100%" px="md">
      <div className={classes.header}>
        <Container size="xl" h={60} p={0}>
          <Group justify="space-between" h="100%" gap="xs">
            <Group h="100%" wrap="nowrap">
              <Link href="/" className={classes.link}>
                <Image src="/logo.png" alt="Jita logo" width={32} height={32} />
              </Link>

              <ServerStatusIndicator />
            </Group>

            <Group h="100%" gap={0} visibleFrom="sm">
              <DesktopHeaderLinkGroup
                title="Character"
                Icon={CharacterSheetIcon}
                items={characterApps}
              />
              <DesktopHeaderLinkGroup
                title="Corporation"
                Icon={CorporationIcon}
                items={corporationApps}
              />
              <DesktopHeaderLinkGroup
                title="Alliance"
                Icon={AlliancesIcon}
                items={allianceApps}
              />
              <DesktopHeaderLinkGroup
                title="Universe"
                Icon={MapIcon}
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
                      <Text size="sm" fw={500} visibleFrom="md">
                        Search
                      </Text>
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
