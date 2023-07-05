import { memo, type PropsWithChildren } from "react";
import { Group, rem, Text, Tooltip } from "@mantine/core";

import { useEsiClientContext } from "@jitaspace/esi-client";

export const JitaSpotlightActionsWrapper = memo(
  ({ children }: PropsWithChildren) => {
    const { scopes } = useEsiClientContext();

    const canUseEsiSearch = scopes.includes("esi-search.search_structures.v1");
    return (
      <div>
        {children}
        <Group
          spacing="xs"
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
          {canUseEsiSearch && (
            <Text size="xs" color="dimmed">
              EVE Search {canUseEsiSearch ? "enabled" : "disabled"}
            </Text>
          )}
          {!canUseEsiSearch && (
            <Tooltip
              label={
                <Text size="xs">
                  To use this feature you must be logged in and provide the
                  following scope:
                  <br />
                  esi-search.search_structures.v1
                </Text>
              }
            >
              <Text size="xs" color="brown">
                EVE Search disabled
              </Text>
            </Tooltip>
          )}
        </Group>
      </div>
    );
  },
);
JitaSpotlightActionsWrapper.displayName = "JitaSpotlightActionsWrapper";
