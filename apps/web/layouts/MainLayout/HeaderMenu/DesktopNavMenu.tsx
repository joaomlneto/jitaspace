"use client";

import type React from "react";
import { memo } from "react";
import Link from "next/link";
import { Box, Center, Menu, Tooltip, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

import type { EveIconProps } from "@jitaspace/eve-icons";

import type { JitaApp } from "~/config/apps";
import classes from "./HeaderMenu.module.css";

export interface DesktopNavMenuProps {
  label: string;
  Icon: React.ComponentType<EveIconProps>;
  apps: Record<string, JitaApp>;
  /** Highlight this group as the current section. */
  active?: boolean;
}

/**
 * A single labelled header dropdown ("Character ▾"). Opens on hover or click and
 * lists its apps as a compact icon + name menu; each item's description shows in
 * a tooltip on hover. The text label is hidden below `md` (icon-only trigger) so
 * the bar stays responsive — the dropdown still names every app.
 */
export const DesktopNavMenu = memo(
  ({ label, Icon, apps, active }: DesktopNavMenuProps) => {
    const items = Object.entries(apps).map(([key, app]) => (
      <Tooltip
        key={key}
        label={app.description}
        position="right"
        withArrow
        openDelay={300}
        multiline
        w={240}
        events={{ hover: true, focus: true, touch: false }}
      >
        <Menu.Item
          component={Link}
          href={app.url ?? "#"}
          leftSection={<app.Icon width={20} />}
        >
          {app.name}
        </Menu.Item>
      </Tooltip>
    ));

    return (
      <Menu
        trigger="click-hover"
        position="bottom-start"
        transitionProps={{ exitDuration: 0 }}
        withinPortal
        radius="md"
        shadow="md"
        closeDelay={100}
      >
        <Menu.Target>
          <UnstyledButton
            className={
              active ? `${classes.link} ${classes.linkActive}` : classes.link
            }
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <Center inline>
              <Icon width={20} />
              <Box component="span" mx={6} visibleFrom="md">
                {label}
              </Box>
              <IconChevronDown
                size={14}
                stroke={1.5}
                style={{ marginInlineStart: 2 }}
              />
            </Center>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>{items}</Menu.Dropdown>
      </Menu>
    );
  },
);
DesktopNavMenu.displayName = "DesktopNavMenu";
