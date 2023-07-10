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
  Kbd,
  Loader,
  rem,
  ScrollArea,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import { openContextModal } from "@mantine/modals";
import { useSpotlight } from "@mantine/spotlight";

import { useEsiClientContext } from "@jitaspace/esi-client";
import {
  CalendarIcon,
  EveMailIcon,
  PeopleAndPlacesIcon,
  SkillsIcon,
} from "@jitaspace/eve-icons";
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

export function LayoutHeader() {
  const pinned = useHeadroom({ fixedAt: 120 });
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const { classes, theme } = useStyles();
  const { isTokenValid, loading } = useEsiClientContext();
  const spotlight = useSpotlight();

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
              <Tooltip label="EveMail" multiline openDelay={200}>
                <Link href="/mail" className={classes.link}>
                  <TotalUnreadMailsIndicator position="bottom-end" offset={8}>
                    <EveMailIcon width={32} height={32} alt="EveMail" />
                  </TotalUnreadMailsIndicator>
                </Link>
              </Tooltip>

              <Tooltip label="Calendar" multiline openDelay={200}>
                <Link href="/calendar" className={classes.link}>
                  <CalendarIcon width={32} height={32} alt="Calendar" />
                </Link>
              </Tooltip>

              <Tooltip label="Skills" multiline openDelay={200}>
                <Link href="/skills" className={classes.link}>
                  <SkillsIcon width={32} height={32} alt="Skills" />
                </Link>
              </Tooltip>

              <Tooltip
                label={
                  <Text>
                    Search <br /> <Kbd size="xs">⌘</Kbd> +{" "}
                    <Kbd size="xs">P</Kbd>
                  </Text>
                }
                multiline
                openDelay={200}
              >
                <UnstyledButton
                  className={classes.link}
                  onClick={() => spotlight.openSpotlight()}
                >
                  <PeopleAndPlacesIcon width={32} height={32} alt="Skills" />
                </UnstyledButton>
              </Tooltip>
            </Group>

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

          <Link href="/mail" className={classes.link} onClick={closeDrawer}>
            <Group>
              <EveMailIcon width={32} height={32} alt="EveMail" />
              <Text>EveMail</Text>
            </Group>
          </Link>

          <Link href="/calendar" className={classes.link} onClick={closeDrawer}>
            <Group>
              <CalendarIcon width={32} height={32} alt="Calendar" />
              <Text>Calendar</Text>
            </Group>
          </Link>

          <Link href="/skills" className={classes.link} onClick={closeDrawer}>
            <Group>
              <SkillsIcon width={32} height={32} alt="Skills" />
              <Text>Skills</Text>
            </Group>
          </Link>

          <UnstyledButton
            className={classes.link}
            onClick={() => {
              closeDrawer();
              spotlight.openSpotlight();
            }}
          >
            <Group>
              <PeopleAndPlacesIcon width={32} height={32} alt="Search" />
              <Text>Search</Text>
            </Group>
          </UnstyledButton>

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
