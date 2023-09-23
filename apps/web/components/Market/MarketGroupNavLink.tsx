import React, { memo, useMemo } from "react";
import Link from "next/link";
import { NavLink } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { TypeAvatar } from "@jitaspace/ui";

type MarketGroupNavLinkProps = {
  marketGroups: Record<
    number,
    {
      name: string;
      parentMarketGroupId: number | null;
      childrenMarketGroupIds: number[];
      types: { typeId: number; name: string }[];
    }
  >;
  marketGroupId: number;
  expand?: boolean;
};

export const MarketGroupNavLink = memo(
  ({ marketGroups, marketGroupId, expand = true }: MarketGroupNavLinkProps) => {
    const marketGroup = marketGroups[marketGroupId];
    const [opened, { toggle }] = useDisclosure(false);

    const childrenMarketGroups = useMemo(
      () =>
        (marketGroup?.childrenMarketGroupIds ?? []).map(
          (childMarketGroupId) => ({
            marketGroupId: childMarketGroupId,
            ...marketGroups[childMarketGroupId]!,
          }),
        ),
      [marketGroups, marketGroup],
    );

    const sortedChildrenMarketGroups = useMemo(
      () =>
        childrenMarketGroups.toSorted((a, b) => a.name.localeCompare(b.name)),
      [childrenMarketGroups],
    );

    const sortedChildrenTypes = useMemo(
      () =>
        (marketGroup?.types ?? []).toSorted((a, b) =>
          a.name.localeCompare(b.name),
        ),
      [],
    );

    if (marketGroup == undefined) return null;

    return (
      <NavLink
        label={marketGroup.name}
        childrenOffset={28}
        opened={opened}
        onChange={() => toggle()}
      >
        {opened &&
          sortedChildrenMarketGroups.map((childMarketGroup) => (
            <MarketGroupNavLink
              marketGroups={marketGroups}
              marketGroupId={childMarketGroup.marketGroupId}
              key={childMarketGroup.marketGroupId}
              expand={opened}
            />
          ))}
        {opened &&
          sortedChildrenTypes.map((type) => (
            <NavLink
              component={Link}
              href={`/market/${type.typeId}`}
              icon={<TypeAvatar size={24} typeId={type.typeId} />}
              label={type.name}
              key={type.typeId}
            />
          ))}
      </NavLink>
    );
  },
);
MarketGroupNavLink.displayName = "MarketGroupNavLink";
