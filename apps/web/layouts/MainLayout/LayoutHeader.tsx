import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Box,
  Burger,
  Container,
  createStyles,
  Divider,
  Drawer,
  Group,
  Header,
  rem,
  ScrollArea,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import {
  IconBook,
  IconChartPie3,
  IconCode,
  IconCoin,
  IconFingerprint,
  IconNotification,
} from "@tabler/icons-react";
import { signIn, useSession } from "next-auth/react";

import { CalendarIcon, EveMailIcon } from "@jitaspace/eve-icons";
import {
  LoginWithEveOnlineButton,
  TotalUnreadMailsIndicator,
} from "@jitaspace/ui";

import UserButton from "./UserButton";

const useStyles = createStyles((theme) => ({
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

  subLink: {
    width: "100%",
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.radius.md,

    ...theme.fn.hover({
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[7]
          : theme.colors.gray[0],
    }),

    "&:active": theme.activeStyles,
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

const mockdata = [
  {
    icon: IconCode,
    title: "Open source",
    description: "This Pokémon’s cry is very loud and distracting",
  },
  {
    icon: IconCoin,
    title: "Free for everyone",
    description: "The fluid of Smeargle’s tail secretions changes",
  },
  {
    icon: IconBook,
    title: "Documentation",
    description: "Yanma is capable of seeing 360 degrees without",
  },
  {
    icon: IconFingerprint,
    title: "Security",
    description: "The shell’s rounded shape and the grooves on its.",
  },
  {
    icon: IconChartPie3,
    title: "Analytics",
    description: "This Pokémon uses its flying ability to quickly chase",
  },
  {
    icon: IconNotification,
    title: "Notifications",
    description: "Combusken battles with the intensely hot flames it spews",
  },
];

export function LayoutHeader() {
  const pinned = useHeadroom({ fixedAt: 120 });
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  //const [linksOpened, { toggle: toggleLinks }] = useDisclosure(false);
  const { classes, theme } = useStyles();
  const { status } = useSession();

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
                <Image src="/logo.png" alt="Jita logo" width={30} height={30} />
                <Text>Jita</Text>
              </Group>
            </Link>

            <Group
              sx={{ height: "100%" }}
              spacing={0}
              className={classes.hiddenMobile}
            >
              <Tooltip
                label="View your EVE Online correspondence whilst out of the game."
                w={200}
                multiline
                openDelay={200}
              >
                <Link href="/mail" className={classes.link}>
                  <TotalUnreadMailsIndicator position="bottom-end" offset={8}>
                    <EveMailIcon width={32} height={32} alt="EveMail" />
                  </TotalUnreadMailsIndicator>
                </Link>
              </Tooltip>
              <Tooltip
                label="View upcoming events and meetings on your EVE Online calendar."
                w={200}
                multiline
                openDelay={200}
              >
                <Link href="/calendar" className={classes.link}>
                  <CalendarIcon width={32} height={32} alt="Calendar" />
                </Link>
              </Tooltip>
            </Group>

            <Group className={classes.hiddenMobile}>
              {status === "authenticated" && <UserButton />}
              {status === "unauthenticated" && (
                <LoginWithEveOnlineButton
                  size="small"
                  onClick={() => {
                    void signIn("eveonline");
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

          <Link href="/mail" className={classes.link}>
            <Group>
              <EveMailIcon width={32} height={32} alt="EveMail" />
              <Text>EveMail</Text>
            </Group>
          </Link>

          <Link href="/calendar" className={classes.link}>
            <Group>
              <CalendarIcon width={32} height={32} alt="Calendar" />
              <Text>Calendar</Text>
            </Group>
          </Link>

          <Divider
            my="sm"
            color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
          />

          <Group position="center" grow pb="xl">
            {status === "authenticated" && <UserButton />}
            {status === "unauthenticated" && (
              <LoginWithEveOnlineButton
                size="small"
                onClick={() => {
                  void signIn("eveonline");
                }}
              />
            )}
          </Group>
        </ScrollArea>
      </Drawer>
    </Box>
  );
}