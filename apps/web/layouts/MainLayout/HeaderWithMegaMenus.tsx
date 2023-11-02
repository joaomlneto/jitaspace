import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Box,
  Burger,
  Center,
  Collapse,
  Container,
  createStyles,
  Divider,
  Drawer,
  Group,
  Header,
  HoverCard,
  Loader,
  rem,
  ScrollArea,
  SimpleGrid,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import { openContextModal } from "@mantine/modals";
import { openSpotlight } from "@mantine/spotlight";
import { IconChevronDown } from "@tabler/icons-react";

import {
  CharacterSheetIcon,
  CorporationIcon,
  MapIcon,
  PeopleAndPlacesIcon,
} from "@jitaspace/eve-icons";
import { useEsiClientContext } from "@jitaspace/hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import {
  allianceApps,
  characterApps,
  corporationApps,
  universeApps,
} from "~/config/apps";
import UserButton from "./UserButton";

const useStyles = createStyles((theme) => ({
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

export function HeaderWithMegaMenus() {
  const router = useRouter();
  const pinned = useHeadroom({ fixedAt: 120 });
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [
    mobileCharacterAppsOpened,
    { toggle: toggleMobileCharacterApps, close: closeMobileCharacterApps },
  ] = useDisclosure(false);
  const [
    mobileCorporationAppsOpened,
    { toggle: toggleMobileCorporationApps, close: closeMobileCorporationApps },
  ] = useDisclosure(false);
  const [
    mobileUniverseAppsOpened,
    { toggle: toggleMobileUniverseApps, close: closeMobileUniverseApps },
  ] = useDisclosure(false);
  const { classes, theme, cx } = useStyles();
  const { isTokenValid, loading } = useEsiClientContext();

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
          <Group position="apart" h="100%" spacing={0}>
            <Group p="xs">
              <Link href="/" className={classes.link}>
                <Image src="/logo.png" alt="Jita logo" width={30} height={30} />
              </Link>
            </Group>

            <Group
              sx={{ height: "100%" }}
              spacing={0}
              className={classes.hiddenMobile}
            >
              <HoverCard
                width={600}
                position="bottom"
                radius="md"
                shadow="md"
                withinPortal
                closeDelay={0}
              >
                <HoverCard.Target>
                  <UnstyledButton className={classes.link}>
                    <Center inline>
                      <Box component="span">
                        <Group spacing="xs">
                          <CharacterSheetIcon width={32} />
                        </Group>
                      </Box>
                    </Center>
                  </UnstyledButton>
                </HoverCard.Target>

                <HoverCard.Dropdown sx={{ overflow: "hidden" }}>
                  <Group spacing="xs">
                    <Text fw={500}>Character Tools</Text>
                  </Group>

                  <Divider
                    my="sm"
                    mx="-md"
                    color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
                  />

                  <SimpleGrid cols={2} spacing={0}>
                    {Object.entries(characterApps).map(([appKey, app]) => (
                      <UnstyledButton
                        component={Link}
                        href={app.url ?? "#"}
                        className={classes.subLink}
                        key={appKey}
                      >
                        <Group noWrap align="flex-start">
                          <app.Icon width={40} />
                          <div>
                            <Text size="sm" fw={500}>
                              {app.name}
                            </Text>
                            <Text size="xs" color="dimmed" lineClamp={2}>
                              {app.description}
                            </Text>
                          </div>
                        </Group>
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                </HoverCard.Dropdown>
              </HoverCard>
              <HoverCard
                width={600}
                position="bottom"
                radius="md"
                shadow="md"
                withinPortal
                closeDelay={0}
              >
                <HoverCard.Target>
                  <UnstyledButton className={classes.link}>
                    <Center inline>
                      <Box component="span">
                        <Group spacing="xs">
                          <CorporationIcon width={32} />
                        </Group>
                      </Box>
                    </Center>
                  </UnstyledButton>
                </HoverCard.Target>

                <HoverCard.Dropdown sx={{ overflow: "hidden" }}>
                  <Group spacing="xs">
                    <Text fw={500}>Corporation Tools</Text>
                  </Group>

                  <Divider
                    my="sm"
                    mx="-md"
                    color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
                  />

                  <SimpleGrid cols={2} spacing={0}>
                    {Object.entries(corporationApps).map(([appKey, app]) => (
                      <UnstyledButton
                        component={Link}
                        href={app.url ?? "#"}
                        className={classes.subLink}
                        key={appKey}
                      >
                        <Group noWrap align="flex-start">
                          <app.Icon width={40} />
                          <div>
                            <Text size="sm" fw={500}>
                              {app.name}
                            </Text>
                            <Text size="xs" color="dimmed" lineClamp={2}>
                              {app.description}
                            </Text>
                          </div>
                        </Group>
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                  <Group spacing="xs" mt="lg">
                    <Text fw={500}>Alliance Tools</Text>
                  </Group>

                  <Divider
                    my="sm"
                    mx="-md"
                    color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
                  />

                  <SimpleGrid cols={2} spacing={0}>
                    {Object.entries(allianceApps).map(([appKey, app]) => (
                      <UnstyledButton
                        component={Link}
                        href={app.url ?? "#"}
                        className={classes.subLink}
                        key={appKey}
                      >
                        <Group noWrap align="flex-start">
                          <app.Icon width={40} />
                          <div>
                            <Text size="sm" fw={500}>
                              {app.name}
                            </Text>
                            <Text size="xs" color="dimmed" lineClamp={2}>
                              {app.description}
                            </Text>
                          </div>
                        </Group>
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                </HoverCard.Dropdown>
              </HoverCard>
              <HoverCard
                width={600}
                position="bottom"
                radius="md"
                shadow="md"
                withinPortal
                closeDelay={0}
              >
                <HoverCard.Target>
                  <UnstyledButton className={classes.link}>
                    <Center inline>
                      <Box component="span">
                        <Group spacing="xs">
                          <MapIcon width={32} />
                        </Group>
                      </Box>
                    </Center>
                  </UnstyledButton>
                </HoverCard.Target>

                <HoverCard.Dropdown sx={{ overflow: "hidden" }}>
                  <Group spacing="xs">
                    <Text fw={500}>Universe Explorer</Text>
                  </Group>

                  <Divider
                    my="sm"
                    mx="-md"
                    color={theme.colorScheme === "dark" ? "dark.5" : "gray.1"}
                  />

                  <SimpleGrid cols={2} spacing={0}>
                    {Object.entries(universeApps).map(([appKey, app]) => (
                      <UnstyledButton
                        component={Link}
                        href={app.url ?? "#"}
                        className={classes.subLink}
                        key={appKey}
                      >
                        <Group noWrap align="flex-start">
                          <app.Icon width={40} />
                          <div>
                            <Text size="sm" fw={500}>
                              {app.name}
                            </Text>
                            <Text size="xs" color="dimmed" lineClamp={2}>
                              {app.description}
                            </Text>
                          </div>
                        </Group>
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                </HoverCard.Dropdown>
              </HoverCard>

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

          <UnstyledButton
            className={classes.link}
            onClick={toggleMobileCharacterApps}
          >
            <Center inline>
              <Group spacing="xs">
                <CharacterSheetIcon width={32} />
                <Box component="span" mr={5}>
                  Character Apps
                </Box>
              </Group>
              <IconChevronDown size={16} color={theme.fn.primaryColor()} />
            </Center>
          </UnstyledButton>
          <Collapse in={mobileCharacterAppsOpened} px="xs">
            {Object.entries(characterApps).map(([appKey, app]) => (
              <UnstyledButton
                component={Link}
                href={app.url ?? "#"}
                className={classes.subLink}
                key={appKey}
                onClick={() => closeDrawer()}
              >
                <Group noWrap align="flex-start">
                  <app.Icon width={32} />
                  <div>
                    <Text size="sm" fw={500}>
                      {app.name}
                    </Text>
                    <Text size="xs" color="dimmed" lineClamp={2}>
                      {app.description}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            ))}
          </Collapse>

          <UnstyledButton
            className={classes.link}
            onClick={toggleMobileCorporationApps}
          >
            <Center inline>
              <Group spacing="xs">
                <CorporationIcon width={32} />
                <Box component="span" mr={5}>
                  Corporation Apps
                </Box>
              </Group>
              <IconChevronDown size={16} color={theme.fn.primaryColor()} />
            </Center>
          </UnstyledButton>
          <Collapse in={mobileCorporationAppsOpened} px="xs">
            {Object.entries(corporationApps).map(([appKey, app]) => (
              <UnstyledButton
                component={Link}
                href={app.url ?? "#"}
                className={classes.subLink}
                key={appKey}
                onClick={() => closeDrawer()}
              >
                <Group noWrap align="flex-start">
                  <app.Icon width={32} />
                  <div>
                    <Text size="sm" fw={500}>
                      {app.name}
                    </Text>
                    <Text size="xs" color="dimmed" lineClamp={2}>
                      {app.description}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            ))}
          </Collapse>

          <UnstyledButton
            className={classes.link}
            onClick={toggleMobileUniverseApps}
          >
            <Center inline>
              <Group spacing="xs">
                <MapIcon width={32} />
                <Box component="span" mr={5}>
                  Universe Apps
                </Box>
              </Group>
              <IconChevronDown size={16} color={theme.fn.primaryColor()} />
            </Center>
          </UnstyledButton>
          <Collapse in={mobileUniverseAppsOpened} px="xs">
            {Object.entries(universeApps).map(([appKey, app]) => (
              <UnstyledButton
                component={Link}
                href={app.url ?? "#"}
                className={classes.subLink}
                key={appKey}
                onClick={() => closeDrawer()}
              >
                <Group noWrap align="flex-start">
                  <app.Icon width={32} />
                  <div>
                    <Text size="sm" fw={500}>
                      {app.name}
                    </Text>
                    <Text size="xs" color="dimmed" lineClamp={2}>
                      {app.description}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            ))}
          </Collapse>

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
