"use client";

import React, { memo } from "react";
import Link from "next/link";
import {
  Box,
  Center,
  Collapse,
  Group,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";

import { EveIconProps } from "@jitaspace/eve-icons";

import { JitaApp } from "~/config/apps";
import classes from "./HeaderWithMegaMenus.module.css";

export type MobileHeaderLinkGroupProps = {
  title: string;
  Icon: (props: EveIconProps) => React.ReactElement<any>;
  onNavigation?: Function;
  items: Record<string, JitaApp>;
};

export const MobileHeaderLinkGroup = memo(
  ({ title, Icon, items, onNavigation }: MobileHeaderLinkGroupProps) => {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    const [
      mobileCharacterAppsOpened,
      { toggle: toggleMobileCharacterApps, close: closeMobileCharacterApps },
    ] = useDisclosure(false);

    return (
      <>
        <UnstyledButton
          className={classes.link}
          onClick={toggleMobileCharacterApps}
        >
          <Center inline>
            <Group gap="xs">
              <Icon width={32} />
              <Box component="span" mr={5}>
                {title}
              </Box>
            </Group>
            <IconChevronDown size={16} color={theme.primaryColor} />
          </Center>
        </UnstyledButton>
        <Collapse in={mobileCharacterAppsOpened} px="xs">
          {Object.entries(items).map(([appKey, app]) => (
            <UnstyledButton
              component={Link}
              href={app.url ?? "#"}
              className={classes.subLink}
              key={appKey}
              onClick={() => onNavigation?.()}
            >
              <Group wrap="nowrap" align="flex-start">
                <app.Icon width={32} />
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
        </Collapse>
      </>
    );
  },
);
