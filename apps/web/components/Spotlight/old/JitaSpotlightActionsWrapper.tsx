"use client";

import { memo, useMemo, type PropsWithChildren } from "react";
import {
  Group,
  rem,
  Text,
  ThemeIcon,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";

import { InfoIcon } from "@jitaspace/eve-icons";
import { useSelectedCharacter } from "@jitaspace/hooks";





export const JitaSpotlightActionsWrapper = memo(
  ({ children }: PropsWithChildren) => {
    const selectedCharacter = useSelectedCharacter();
    const scopes = useMemo(
      () => selectedCharacter?.accessTokenPayload.scp ?? [],
      [selectedCharacter],
    );
    const theme = useMantineTheme();
    const colorScheme = useColorScheme();
    const canUseEsiSearch = scopes.includes("esi-search.search_structures.v1");
    const canReadStructures = scopes.includes(
      "esi-universe.read_structures.v1",
    );

    return (
      <div>
        {children}
        <Group
          gap="xs"
          justify="space-between"
          px={15}
          py="xs"
          style={{
            borderTop: `${rem(1)} solid ${
              colorScheme === "dark"
                ? theme.colors.dark[4]
                : theme.colors.gray[2]
            }`,
          }}
        >
          <Group gap="xs">
            {canUseEsiSearch && (
              <Text size="xs" c="dimmed">
                ESI Search enabled.
              </Text>
            )}
            {!canUseEsiSearch && (
              <Tooltip
                multiline
                label="To enable you must be logged in and provide the esi-search.search_structures.v1 scope"
              >
                <Text size="xs" color="brown">
                  ESI Search disabled.
                </Text>
              </Tooltip>
            )}
            {canUseEsiSearch && !canReadStructures && (
              <Tooltip
                multiline
                label="To enable you must be logged in and provide the esi-universe.read_structures.v1 scope"
              >
                <Text size="xs" color="brown">
                  Structure search disabled.
                </Text>
              </Tooltip>
            )}
          </Group>
          <Tooltip
            multiline
            label={
              <Text size="xs">
                EVE Search allows you to search the EVE Universe for Agents,
                Alliances, Characters, Constellations, Corporations, Factions,
                Inventory Types, Regions, Solar Systems, Stations and
                Structures.
              </Text>
            }
          >
            <ThemeIcon variant="none">
              <InfoIcon width={24} />
            </ThemeIcon>
          </Tooltip>
        </Group>
      </div>
    );
  },
);
JitaSpotlightActionsWrapper.displayName = "JitaSpotlightActionsWrapper";
