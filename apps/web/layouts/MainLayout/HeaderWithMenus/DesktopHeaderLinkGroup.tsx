"use client";

import type React from "react";
import { memo } from "react";
import Link from "next/link";
import { Box, Center, Group, Menu, Text, UnstyledButton } from "@mantine/core";

import type { EveIconProps } from "@jitaspace/eve-icons";

import type { JitaApp } from "~/config/apps";
import classes from "./HeaderWithMenus.module.css";

export interface DesktopHeaderLinkGroupProps {
  title: string;
  Icon: React.ComponentType<EveIconProps>;
  items: Record<string, JitaApp>;
}

export const DesktopHeaderLinkGroup = memo(
  ({ title, Icon, items }: DesktopHeaderLinkGroupProps) => {
    return (
      <Menu
        trigger="hover"
        openDelay={100}
        closeDelay={400}
        withinPortal
        width={250}
        position="bottom-start"
      >
        <Menu.Target>
          <UnstyledButton className={classes.link}>
            <Center inline>
              <Box component="span">
                <Group gap="xs">
                  <Icon width={32} />
                  <Text size="sm" fw={500} visibleFrom="md">
                    {title}
                  </Text>
                </Group>
              </Box>
            </Center>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>{title}</Menu.Label>
          {Object.entries(items).map(([appKey, app]) => (
            <Menu.Item
              key={appKey}
              component={Link}
              href={app.url ?? "#"}
              leftSection={<app.Icon width={24} />}
            >
              <div>
                <Text size="sm" fw={500}>
                  {app.name}
                </Text>
              </div>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    );
  },
);
DesktopHeaderLinkGroup.displayName = "DesktopHeaderLinkGroup";
