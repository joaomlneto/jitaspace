import React from "react";
import Link, { type LinkProps } from "next/link";
import {
  ActionIcon,
  Anchor,
  Container,
  Group,
  rem,
  Text,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconBrandDiscordFilled } from "@tabler/icons-react";

import { env } from "~/env.mjs";

const FOOTER_BREAKPOINT = "xs";
const FOOTER_HEIGHT_DESKTOP = rem(51);
const FOOTER_HEIGHT_MOBILE = rem(86);

const links: { link: LinkProps["href"]; label: string }[] = [
  {
    link: "/about",
    label: "About",
  },
  {
    link: "/status",
    label: "Status",
  },
];

export function FooterWithLinks() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const items = links.map((link) => (
    <Anchor
      key={link.label}
      component={Link}
      href={link.link}
      size="xs"
      c="dimmed"
    >
      {link.label}
    </Anchor>
  ));

  return (
    <footer
      style={{
        height: FOOTER_HEIGHT_MOBILE,
        position: "absolute",
        width: "100%",
        marginTop: theme.spacing.md,
        borderTop: `${rem(1)} solid ${
          colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[2]
        }`,
        /**
         * FIXME MANTINE V7 MIGRATION
         */
        /*
        [theme.fn.largerThan(FOOTER_BREAKPOINT)]: {
          height: FOOTER_HEIGHT_DESKTOP,
        },
        [theme.fn.smallerThan(FOOTER_BREAKPOINT)]: {
          height: FOOTER_HEIGHT_MOBILE,
        },*/
      }}
    >
      <Container
        size="xl"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.md,

          /* FIXME MANTINE V7 MIGRATION */
          /*
        [theme.fn.smallerThan(FOOTER_BREAKPOINT)]: {
          flexDirection: "column-reverse",
        },*/
        }}
      >
        <Text c="dimmed" size="xs">
          All EVE-related materials are property of{" "}
          <Anchor c="dimmed" href="https://www.ccpgames.com" target="_blank">
            CCP Games
          </Anchor>
          .
        </Text>
        <Group
          style={
            {
              // FIXME MANTINE V7 MIGRATION
              /*
          [theme.fn.smallerThan(FOOTER_BREAKPOINT)]: {
            marginBottom: theme.spacing.md,
          },*/
            }
          }
        >
          <Tooltip label="Join our Discord!" color="dark">
            <ActionIcon
              component="a"
              href={env.NEXT_PUBLIC_DISCORD_INVITE_LINK}
              target="_blank"
              size="sm"
              variant="light"
            >
              <IconBrandDiscordFilled />
            </ActionIcon>
          </Tooltip>
          {items}
        </Group>
      </Container>
    </footer>
  );
}
