"use client";

import type { LinkProps } from "next/link";
import Link from "next/link";
import {
  ActionIcon,
  Anchor,
  Container,
  Group,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconBrandDiscordFilled } from "@tabler/icons-react";

import { PartnerBadge } from "~/components/Badge";
import { env } from "~/env";
import classes from "./FooterWithLinks.module.css";

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
      c="dimmed"
    >
      {link.label}
    </Anchor>
  ));

  return (
    <div className={classes.footer}>
      <Container size="xl" className={classes.inner}>
        <Text c="dimmed" size="xs">
          All EVE-related materials are property of{" "}
          <Anchor c="dimmed" href="https://www.ccpgames.com" target="_blank">
            CCP Games
          </Anchor>
          .
        </Text>
        <a href="https://www.eveonline.com/partners" target="_blank">
          <PartnerBadge height={24} />
        </a>
        <Group className={classes.links}>
          <Tooltip label="Join our Discord!" color="dark">
            <ActionIcon
              component="a"
              href={env.NEXT_PUBLIC_DISCORD_INVITE_LINK}
              target="_blank"
              size="sm"
              variant="transparent"
              c="dimmed"
            >
              <IconBrandDiscordFilled />
            </ActionIcon>
          </Tooltip>
          {items}
        </Group>
      </Container>
    </div>
  );
}
