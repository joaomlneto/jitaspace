import { memo, type PropsWithChildren } from "react";
import { Group, rem, Text, ThemeIcon, Tooltip } from "@mantine/core";

import { InfoIcon } from "@jitaspace/eve-icons";
import { useEsiClientContext } from "@jitaspace/hooks";

export const JitaSpotlightActionsWrapper = memo(
  ({ children }: PropsWithChildren) => {
    const { scopes } = useEsiClientContext();

    const canUseEsiSearch = scopes.includes("esi-search.search_structures.v1");
    const canReadStructures = scopes.includes(
      "esi-universe.read_structures.v1",
    );

    return (
      <div>
        {children}
        <Group
          spacing="xs"
          position="apart"
          px={15}
          py="xs"
          sx={(theme) => ({
            borderTop: `${rem(1)} solid ${
              theme.colorScheme === "dark"
                ? theme.colors.dark[4]
                : theme.colors.gray[2]
            }`,
          })}
        >
          <Group spacing="xs">
            {canUseEsiSearch && (
              <Text size="xs" color="dimmed">
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
