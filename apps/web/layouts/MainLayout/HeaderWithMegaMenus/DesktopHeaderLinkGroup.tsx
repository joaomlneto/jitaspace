"use client";

import React, { memo } from "react";
import Link from "next/link";
import {
  Box,
  Center,
  Divider,
  Group,
  HoverCard,
  SimpleGrid,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { EveIconProps } from "@jitaspace/eve-icons";

import { JitaApp } from "~/config/apps";
import classes from "./HeaderWithMegaMenus.module.css";

export type DesktopHeaderLinkGroupProps = {
  title: string;
  Icon: (props: EveIconProps) => React.ReactElement<any>;
  items: Record<string, JitaApp>;
};

export const DesktopHeaderLinkGroup = memo(
  ({ title, Icon, items }: DesktopHeaderLinkGroupProps) => {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    const [
      mobileCharacterAppsOpened,
      { toggle: toggleMobileCharacterApps, close: closeMobileCharacterApps },
    ] = useDisclosure(false);

    return (
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
                <Group gap="xs">
                  <Icon width={32} />
                </Group>
              </Box>
            </Center>
          </UnstyledButton>
        </HoverCard.Target>

        <HoverCard.Dropdown style={{ overflow: "hidden" }}>
          <Group gap="xs">
            <Text fw={500}>{title}</Text>
          </Group>

          <Divider
            my="sm"
            mx="-md"
            color={colorScheme === "dark" ? "dark.5" : "gray.1"}
          />

          <SimpleGrid cols={2} spacing={0}>
            {Object.entries(items).map(([appKey, app]) => (
              <UnstyledButton
                component={Link}
                href={app.url ?? "#"}
                className={classes.subLink}
                key={appKey}
              >
                <Group wrap="nowrap" align="flex-start">
                  <app.Icon width={40} />
                  <div>
                    <Text size="sm" fw={500}>
                      {app.name}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {app.description}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            ))}
          </SimpleGrid>
        </HoverCard.Dropdown>
      </HoverCard>
    );
  },
);
DesktopHeaderLinkGroup.displayName = "DesktopHeaderLinkGroup";
