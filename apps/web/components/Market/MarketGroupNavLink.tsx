"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { NavLink } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { EveIconAvatarDisplay, TypeAvatar } from "@jitaspace/ui";

/**
 * The whole market tree, bundled by `MarketGroupsNavigation` from a single
 * server-side query. Everything a NavLink renders — including the group icon —
 * comes from here, so expanding the tree never hits the network.
 */
export type MarketGroupIndex = Record<
  number,
  {
    name: string;
    parentMarketGroupId: number | null;
    childrenMarketGroupIds: number[];
    types: { typeId: number; name: string }[];
    iconFile: string | null;
  }
>;

interface MarketGroupNavLinkProps {
  marketGroups: MarketGroupIndex;
  marketGroupId: number;
  expand?: boolean;
}

export const MarketGroupNavLink = memo(
  ({
    marketGroups,
    marketGroupId,
    expand: _expand = true,
  }: MarketGroupNavLinkProps) => {
    const marketGroup = marketGroups[marketGroupId];
    const [opened, { toggle }] = useDisclosure(false);

    const childrenMarketGroups = useMemo(
      () =>
        (marketGroup?.childrenMarketGroupIds ?? []).flatMap(
          (childMarketGroupId) => {
            const childMarketGroup = marketGroups[childMarketGroupId];
            if (!childMarketGroup) return [];
            return [
              {
                marketGroupId: childMarketGroupId,
                ...childMarketGroup,
              },
            ];
          },
        ),
      [marketGroups, marketGroup],
    );

    const sortedChildrenMarketGroups = useMemo(
      () =>
        [...childrenMarketGroups].sort((a, b) => a.name.localeCompare(b.name)),
      [childrenMarketGroups],
    );

    const sortedChildrenTypes = useMemo(
      () =>
        [...(marketGroup?.types ?? [])].sort((a, b) =>
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
        leftSection={
          <EveIconAvatarDisplay
            size={24}
            iconFile={marketGroup.iconFile}
            alt={marketGroup.name}
          />
        }
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
              leftSection={
                <TypeAvatar size={24} typeId={type.typeId} variation="icon" />
              }
              label={type.name}
              key={type.typeId}
            />
          ))}
      </NavLink>
    );
  },
);
MarketGroupNavLink.displayName = "MarketGroupNavLink";
