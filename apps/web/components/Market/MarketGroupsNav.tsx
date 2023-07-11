import React, { memo, useState } from "react";
import {
  Box,
  Group,
  NavLink,
  Skeleton,
  Text,
  type NavLinkProps,
} from "@mantine/core";

import { useMarketGroups } from "~/hooks/useMarketGroupsTree";

type MarketGroupsNavProps = NavLinkProps & {
  marketGroupId?: number;
};

export const MarketGroupsNav = memo(
  ({ marketGroupId, ...otherProps }: MarketGroupsNavProps) => {
    const { data, rootMarketGroupIds, loading } = useMarketGroups();

    const isRootNode = !marketGroupId;

    const [opened, setOpened] = useState(false);

    if (loading) return "Loading Market Groups...";

    if (isRootNode) {
      return (
        <Box>
          {rootMarketGroupIds
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .map((marketGroupId) => data[marketGroupId]!)
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

    const marketGroup = data[marketGroupId];

    if (!marketGroup) return null;

    const childGroupIds: number[] = data[marketGroupId]?.children ?? [];

    const childGroups = childGroupIds
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((marketGroupId) => data[marketGroupId]!)
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <NavLink
        {...otherProps}
        label={marketGroupId ? data[marketGroupId]?.name : "Root"}
        opened={opened}
        onChange={setOpened}
      >
        {!opened && (
          <Skeleton>
            {opened &&
              childGroups.map((marketGroup) => (
                <NavLink
                  key={marketGroup.market_group_id}
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
          </Skeleton>
        )}
        {opened &&
          childGroups.map((marketGroup) => (
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
