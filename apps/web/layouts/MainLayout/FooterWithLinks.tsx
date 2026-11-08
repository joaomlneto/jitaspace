"use client";

import type { LinkProps } from "next/link";
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
import { HoverPrefetchLink } from "~/components/Link";
import { env } from "~/env";
import classes from "./FooterWithLinks.module.css";

const links: { link: LinkProps["href"]; label: string }[] = [
  {
    link: "/about",
    label: "About",
  },
  {
    link: "/support",
    label: "Support",
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
      component={HoverPrefetchLink}
      href={link.link}
      // The footer renders on every page, so prefetching these on sight would
      // fetch /about, /support and /status on every single page view — four
      // PPR segment requests each (~400k requests/day in production). They
      // prefetch on hover instead.
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
          <Anchor c="dimmed" href="https://fenriscreations.com" target="_blank">
            Fenris Creations
          </Anchor>
          .
        </Text>
        <a
          href="https://www.eveonline.com/partners"
          target="_blank"
          rel="noreferrer"
        >
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
              aria-label="JitaSpace on Discord"
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
