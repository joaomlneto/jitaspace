"use client";

import { ActionIcon, Menu } from "@mantine/core";
import {
  IconBrandDiscordFilled,
  IconExternalLink,
  IconInfoCircle,
} from "@tabler/icons-react";

import { HoverPrefetchLink } from "~/components/Link";
import { env } from "~/env";
import { siteLinks } from "../siteLinks";
import classes from "./HeaderMenu.module.css";

/**
 * The JitaSpace menu: the site's own pages (About, Support, Status) and the
 * Discord invite, which used to live only in the fixed footer. The same compact
 * button on desktop and on phones, where the header has room for it beside the
 * avatar and the burger. It opens on click (and on hover with a mouse, like the
 * nav triggers); every item is a plain link, so it works the same on touch.
 */
export function SiteLinksMenu() {
  return (
    <Menu
      trigger="click-hover"
      position="bottom-end"
      transitionProps={{ exitDuration: 0 }}
      withinPortal
      radius="md"
      shadow="md"
      closeDelay={100}
    >
      <Menu.Target>
        <ActionIcon
          className={classes.searchIcon}
          variant="default"
          size="lg"
          radius="sm"
          aria-label="About JitaSpace"
        >
          <IconInfoCircle size={20} stroke={1.5} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown miw={200}>
        <Menu.Label>JitaSpace</Menu.Label>
        {siteLinks.map(({ href, label, Icon }) => (
          <Menu.Item
            key={href}
            component={HoverPrefetchLink}
            href={href}
            leftSection={<Icon size={18} stroke={1.5} />}
          >
            {label}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          component="a"
          href={env.NEXT_PUBLIC_DISCORD_INVITE_LINK}
          target="_blank"
          rel="noreferrer"
          leftSection={<IconBrandDiscordFilled size={18} />}
          rightSection={<IconExternalLink size={14} stroke={1.5} />}
        >
          Discord
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
