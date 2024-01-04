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
} from "@mantine/core";
import { IconBrandDiscordFilled } from "@tabler/icons-react";

import { env } from "~/env.mjs";
import classes from "./FooterWithLinks.module.css";


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
  const items = links.map((link) => (
    <Anchor
      key={link.label}
      component={Link}
      href={link.link}
      size="xs"
      color="dimmed"
    >
      {link.label}
    </Anchor>
  ));

  return (
    <footer className={classes.footer}>
      <Container size="xl" className={classes.inner}>
        <Text color="dimmed" size="xs">
          All EVE-related materials are property of{" "}
          <Anchor
            color="dimmed"
            href="https://www.ccpgames.com"
            target="_blank"
          >
            CCP Games
          </Anchor>
          .
        </Text>
        <Group className={classes.links}>
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
