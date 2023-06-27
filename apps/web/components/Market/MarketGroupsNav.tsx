import React, { memo } from "react";
import { Box, Group, NavLink, Text, type NavLinkProps } from "@mantine/core";

import { useMarketGroupsTree } from "~/hooks/useMarketGroupsTree";

type MarketGroupsNavProps = NavLinkProps & {
  marketGroupId?: number;
};

export const MarketGroupsNav = memo(
  ({ marketGroupId, ...otherProps }: MarketGroupsNavProps) => {
    const { data } = useMarketGroupsTree();

    const isRootNode = !marketGroupId;

    if (isRootNode) {
      return (
        <Box>
          {data.rootGroups
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .map((marketGroupId) => data.marketGroups[marketGroupId]!)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((marketGroup) => (
              <MarketGroupsNav
                key={marketGroup.market_group_id}
                marketGroupId={marketGroup.market_group_id}
                label={
                  <Group position="apart">
                    <Text>
                      {marketGroup.market_group_id} - {marketGroup.name}
                    </Text>
                  </Group>
                }
                {...otherProps}
              />
            ))}
        </Box>
      );
    }

    const marketGroup = data.marketGroups[marketGroupId];

    if (!marketGroup) return null;

    const childGroupIds: number[] = isRootNode
      ? data.rootGroups
      : data.marketGroups[marketGroupId]?.children ?? [];

    const childGroups = childGroupIds
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((marketGroupId) => data.marketGroups[marketGroupId]!)
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <NavLink
        {...otherProps}
        label={marketGroupId ? data.marketGroups[marketGroupId]?.name : "Root"}
      >
        {childGroups.map((marketGroup) => (
          <MarketGroupsNav
            key={marketGroup.market_group_id}
            marketGroupId={marketGroup.market_group_id}
            label={
              <Group position="apart">
                <Text>
                  {marketGroup.market_group_id} - {marketGroup.name}
                </Text>
              </Group>
            }
            {...otherProps}
          />
        ))}
        {/*marketGroup.types.map((typeId) => (
          <NavLink key={typeId} label={typeId} />
        ))*/}
      </NavLink>
    );
  },
);
MarketGroupsNav.displayName = "MarketGroupsNav";
