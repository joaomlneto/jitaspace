"use client";

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
import { isExternalUrl, jitaSpaceApps } from "~/config/apps";
import { env } from "~/env";
import classes from "./FooterWithLinks.module.css";

/**
 * The page footer: the last thing in the page's flow, so it is seen only by
 * scrolling to the bottom (and sits at the bottom of the viewport on a page
 * shorter than the screen). The same links are always reachable from the
 * header's About menu.
 */
export function FooterWithLinks() {
  const items = Object.values(jitaSpaceApps)
    // Discord gets its own icon button below.
    .filter((app) => app.url && !isExternalUrl(app.url))
    .map((app) => (
      <Anchor
        key={app.name}
        component={HoverPrefetchLink}
        href={app.url ?? "#"}
        // The footer renders on every page, so prefetching these on sight
        // would fetch /about, /support and /status on every single page view —
        // four PPR segment requests each (~400k requests/day in production).
        // They prefetch on hover instead.
        size="xs"
        c="dimmed"
      >
        {app.name}
      </Anchor>
    ));

  return (
    <footer className={classes.footer}>
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
    </footer>
  );
}
