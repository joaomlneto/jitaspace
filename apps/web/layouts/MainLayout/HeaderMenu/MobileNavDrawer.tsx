"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Divider,
  Drawer,
  Group,
  rem,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { openSpotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";

import { useAuthenticatedCharacterIds } from "@jitaspace/hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { jitaApps } from "~/config/apps";
import UserButton from "~/layouts/MainLayout/UserButton";
import classes from "./HeaderMenu.module.css";

export interface MobileNavDrawerProps {
  opened: boolean;
  close: () => void;
}

/**
 * Full-screen navigation for phones (below the `sm` breakpoint, where the
 * desktop bar is hidden). Mirrors the desktop groups as flat, always-expanded
 * sections, and brings the search box along.
 */
export const MobileNavDrawer = memo(
  ({ opened, close }: MobileNavDrawerProps) => {
    const characterIds = useAuthenticatedCharacterIds();

    return (
      <Drawer
        opened={opened}
        onClose={close}
        size="100%"
        padding="md"
        title="Navigation"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h={`calc(100vh - ${rem(60)})`} mx="-md">
          <UnstyledButton
            className={classes.search}
            mx="md"
            mb="sm"
            onClick={() => {
              close();
              openSpotlight();
            }}
            aria-label="Search New Eden"
          >
            <IconSearch size={16} stroke={1.5} />
            <Text className={classes.searchLabel} size="sm" c="dimmed">
              Search New Eden…
            </Text>
          </UnstyledButton>

          <Divider mb="sm" />

          {Object.values(jitaApps).map((group) => (
            <Stack gap={2} key={group.name} mb="sm">
              <Group gap="xs" px="md" py={4}>
                <group.Icon width={20} />
                <Text fw={600} size="sm">
                  {group.name}
                </Text>
              </Group>
              {Object.entries(group.apps).map(([key, app]) => (
                <UnstyledButton
                  key={key}
                  component={Link}
                  href={app.url ?? "#"}
                  className={classes.link}
                  onClick={close}
                >
                  <Group gap="sm" wrap="nowrap">
                    <app.Icon width={24} />
                    <Text size="sm">{app.name}</Text>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          ))}

          <Divider my="sm" />

          <Group justify="center" grow pb="xl" px="md">
            {characterIds.length > 0 && <UserButton />}
            {characterIds.length === 0 && (
              <LoginWithEveOnlineButton
                size="small"
                onClick={() => {
                  close();
                  openContextModal({
                    modal: "login",
                    title: "Login",
                    size: "xl",
                    innerProps: {},
                  });
                }}
              />
            )}
          </Group>
        </ScrollArea>
      </Drawer>
    );
  },
);
MobileNavDrawer.displayName = "MobileNavDrawer";
