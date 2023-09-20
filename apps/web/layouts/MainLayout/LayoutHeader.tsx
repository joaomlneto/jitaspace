import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  AppShell,
  AppShellHeaderProps,
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

import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { jitaApps } from "~/config/apps";
import UserButton from "./UserButton";

export const LayoutHeader = memo((props: AppShellHeaderProps) => {
  const router = useRouter();
  const pinned = useHeadroom({ fixedAt: 120 });
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const { isTokenValid, loading } = useEsiClientContext();

  const classes = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    logo: {
      display: "flex",
      alignItems: "center",
      height: "100%",
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.md,
      textDecoration: "none",
      color: colorScheme === "dark" ? theme.white : theme.black,
      fontWeight: 500,
      fontSize: theme.fontSizes.sm,

      // FIXME MANTINE V7 MIGRATION
      /*
      [theme.fn.smallerThan("sm")]: {
        height: rem(42),
        display: "flex",
        alignItems: "center",
      },

      ...theme.fn.hover({
        backgroundColor:
            theme.colorScheme === "dark"
                ? theme.colors.dark[6]
                : theme.colors.gray[0],
      }),*/
    },

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    link: {
      display: "flex",
      alignItems: "center",
      height: "100%",
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.md,
      textDecoration: "none",
      color: colorScheme === "dark" ? theme.white : theme.black,
      fontWeight: 500,
      fontSize: theme.fontSizes.sm,
      // FIXME MANTINE V7 MIGRATION
      /*
      [theme.fn.smallerThan("sm")]: {
        height: rem(42),
        display: "flex",
        alignItems: "center",
        width: "100%",
      },

      ...theme.fn.hover({
        backgroundColor:
            theme.colorScheme === "dark"
                ? theme.colors.dark[6]
                : theme.colors.gray[0],
      }),*/
    },

    dropdownFooter: {
      backgroundColor:
        colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[0],
      margin: `calc(${theme.spacing.md} * -1)`,
      marginTop: theme.spacing.sm,
      padding: `${theme.spacing.md} calc(${theme.spacing.md} * 2)`,
      paddingBottom: theme.spacing.xl,
      borderTop: `${rem(1)} solid ${
        colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1]
      }`,
    },

    selected: {
      backgroundColor:
        colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[0],
    },

    // FIXME MANTINE V7 MIGRATION
    hiddenMobile: {
      /*
      [theme.fn.smallerThan("sm")]: {
        display: "none",
      },*/
    },

    // FIXME MANTINE V7 MIGRATION
    hiddenDesktop: {
      /*
      [theme.fn.largerThan("sm")]: {
        display: "none",
      },*/
    },
  };

  return (
    <AppShell.Header
      px="md"
      style={{
        transform: `translate3d(0, ${pinned ? 0 : rem(-110)}, 0)`,
        transition: "transform 400ms ease",
      }}
      {...props}
    >
      <Box>
        <Container size="xl" h={60} p={0}>
          <Group justify="apart" style={{ height: "100%" }}>
            <Link href="/" style={classes.logo}>
              <Group p="xs">
                <Image src="/logo.png" alt="Jita logo" width={30} height={30} />
                <Text>Jita</Text>
              </Group>
            </Link>

            <Group
              // FIXME MANTINE V7 MIGRATION
              style={{ height: "100%", ...classes.hiddenMobile }}
              gap={0}
            >
              {Object.values(jitaApps).map((app) => {
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
                      // FIXME MANTINE V7 MIGRATION
                      style={{
                        ...classes.link /*{
                        [classes.selected]: isActive,
                      }*/,
                      }}
                    >
                      <app.Icon width={32} height={32} alt="EveMail" />
                    </Link>
                  </Tooltip>
                );
              })}
            </Group>

            <Group style={classes.hiddenMobile}>
              {loading && (
                <Group>
                  <Loader size="sm" />
                  <Text>Loading session…</Text>
                </Group>
              )}
              {!loading && isTokenValid && <UserButton />}
              {!loading && !isTokenValid && (
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
              style={classes.hiddenDesktop}
            />
          </Group>
        </Container>

        <Drawer
          opened={drawerOpened}
          onClose={closeDrawer}
          size="100%"
          padding="md"
          title="Navigation"
          style={classes.hiddenDesktop}
          zIndex={1000000}
          position="top"
        >
          <ScrollArea h={`calc(100vh - ${rem(70)})`} mx="-md">
            <Divider
              my="sm"
              color={colorScheme === "dark" ? "dark.5" : "gray.1"}
            />
            {Object.values(jitaApps).map((app) => {
              const isActive =
                app.url !== undefined &&
                router.pathname.startsWith(app.url.toString());
              return (
                <Link
                  key={app.name}
                  href={app.url ?? ""}
                  style={{
                    ...classes.link /*{
                  [classes.selected]: isActive,
                }*/,
                  }}
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
              {loading && (
                <Group>
                  <Loader size="sm" />
                  <Text>Loading session…</Text>
                </Group>
              )}
              {!loading && isTokenValid && <UserButton />}
              {!loading && !isTokenValid && (
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
    </AppShell.Header>
  );
});
LayoutHeader.displayName = "LayoutHeader";
