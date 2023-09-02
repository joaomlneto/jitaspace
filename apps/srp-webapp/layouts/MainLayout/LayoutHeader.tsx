import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Box,
  Burger,
  Container,
  createStyles,
  Divider,
  Drawer,
  Group,
  Header,
  Loader,
  rem,
  ScrollArea,
  Text,
} from "@mantine/core";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import { signIn } from "next-auth/react";

import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { AppLogo } from "~/components/Logo";
import UserButton from "./UserButton";

const useStyles = createStyles((theme) => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  logo: {
    display: "flex",
    alignItems: "center",
    height: "100%",
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    textDecoration: "none",
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    fontWeight: 500,
    fontSize: theme.fontSizes.sm,

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
    }),
  },

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  link: {
    display: "flex",
    alignItems: "center",
    height: "100%",
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    textDecoration: "none",
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    fontWeight: 500,
    fontSize: theme.fontSizes.sm,

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
    }),
  },

  dropdownFooter: {
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[7]
        : theme.colors.gray[0],
    margin: `calc(${theme.spacing.md} * -1)`,
    marginTop: theme.spacing.sm,
    padding: `${theme.spacing.md} calc(${theme.spacing.md} * 2)`,
    paddingBottom: theme.spacing.xl,
    borderTop: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1]
    }`,
  },

  selected: {
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[5]
        : theme.colors.gray[0],
  },

  hiddenMobile: {
    [theme.fn.smallerThan("sm")]: {
      display: "none",
    },
  },

  hiddenDesktop: {
    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },
}));

export function LayoutHeader() {
  const router = useRouter();
  const pinned = useHeadroom({ fixedAt: 120 });
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const { classes, theme, cx } = useStyles();
  const { isTokenValid, loading } = useEsiClientContext();

  return (
    <Box>
      <Header
        height={rem(60)}
        px="md"
        sx={{
          transform: `translate3d(0, ${pinned ? 0 : rem(-110)}, 0)`,
          transition: "transform 400ms ease",
        }}
      >
        <Container size="xl" h={60} p={0}>
          <Group position="apart" sx={{ height: "100%" }}>
            <Link href="/" className={classes.logo}>
              <Group p="xs">
                <AppLogo height={40} />
              </Group>
            </Link>

            <Group className={classes.hiddenMobile}>
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
                    void signIn(
                      "eveonline",
                      {},
                      {
                        scope: [].join(" "),
                      },
                    );
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

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title="Navigation"
        className={classes.hiddenDesktop}
        zIndex={1000000}
        position="top"
      >
        <ScrollArea h={`calc(100vh - ${rem(70)})`} mx="-md">
          <Divider
            my="sm"
            color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
          />

          <Group position="center" grow pb="xl">
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
                  void signIn(
                    "eveonline",
                    {},
                    {
                      scope: [].join(" "),
                    },
                  );
                }}
              />
            )}
          </Group>
        </ScrollArea>
      </Drawer>
    </Box>
  );
}
