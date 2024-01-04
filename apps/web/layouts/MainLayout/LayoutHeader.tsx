import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  AppShell,
  Box,
  Burger,
  Container,
  Divider,
  Drawer,
  Group,
  Kbd,
  Loader,
  rem,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import { openContextModal } from "@mantine/modals";

import { useSelectedCharacter } from "@jitaspace/hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { characterApps } from "~/config/apps";
import classes from "./LayoutHeader.module.css";
import UserButton from "./UserButton";

export function LayoutHeader() {
  const router = useRouter();
  const pinned = useHeadroom({ fixedAt: 120 });
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const character = useSelectedCharacter();

  return (
    <Box>
      <AppShell.Header
        h={rem(60)}
        px="md"
        style={{
          transform: `translate3d(0, ${pinned ? 0 : rem(-110)}, 0)`,
          transition: "transform 400ms ease",
        }}
      >
        <Container size="xl" h={60} p={0}>
          <Group justify="space-between" style={{ height: "100%" }}>
            <Link href="/" className={classes.logo}>
              <Group p="xs">
                <Image src="/logo.png" alt="Jita logo" width={30} height={30} />
                <Text>Jita</Text>
              </Group>
            </Link>

            <Group style={{ height: "100%" }} gap={0} visibleFrom="sm">
              {Object.values(characterApps).map((app) => {
                const isActive =
                  app.url !== undefined &&
                  router.pathname.startsWith(app.url.toString());
                return (
                  <Tooltip
                    key={app.name}
                    color="dark"
                    label={
                      <Stack gap={4} align="center">
                        <Text>{app.name}</Text>
                        {app.hotKey && (
                          <Group gap="xs">
                            {app.hotKey.map((key) => (
                              <Text span key={key}>
                                <Kbd size="xs">{key}</Kbd>
                              </Text>
                            ))}
                          </Group>
                        )}
                      </Stack>
                    }
                    multiline
                    openDelay={200}
                  >
                    <Link
                      href={app.url ?? ""}
                      onClick={app.onClick}
                      style={
                        {
                          //[classes.selected]: isActive, // FIXME Mantine v7 migration
                        }
                      }
                    >
                      <app.Icon width={32} height={32} alt="EveMail" />
                    </Link>
                  </Tooltip>
                );
              })}
            </Group>

            <Group visibleFrom="sm">
              {false && (
                <Group>
                  <Loader size="sm" />
                  <Text>Loading session…</Text>
                </Group>
              )}
              {character !== null && <UserButton />}
              {character === null && (
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
      </AppShell.Header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title="Navigation"
        hiddenFrom="sm"
        zIndex={1000000}
        position="top"
      >
        <ScrollArea h={`calc(100vh - ${rem(70)})`} mx="-md">
          <Divider
            my="sm"
            color={colorScheme === "dark" ? "dark.5" : "gray.1"}
          />
          {Object.values(characterApps).map((app) => {
            const isActive =
              app.url !== undefined &&
              router.pathname.startsWith(app.url.toString());
            return (
              <Link
                key={app.name}
                href={app.url ?? ""}
                /*
                className={cx(classes.link, {
                  [classes.selected]: isActive,
                })} // FIXME Mantine v7 migration */
                onClick={() => {
                  closeDrawer();
                  app.onClick?.();
                }}
              >
                <Group>
                  <app.Icon width={32} height={32} alt="EveMail" />
                  <Text>{app.name}</Text>
                </Group>
              </Link>
            );
          })}

          <Divider
            my="sm"
            color={colorScheme === "dark" ? "dark.5" : "gray.1"}
          />

          <Group justify="center" grow pb="xl">
            {false && (
              <Group>
                <Loader size="sm" />
                <Text>Loading session…</Text>
              </Group>
            )}
            {character !== null && <UserButton />}
            {character === null && (
              <LoginWithEveOnlineButton
                size="small"
                onClick={() => {
                  toggleDrawer();
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
    </Box>
  );
}
