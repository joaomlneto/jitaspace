"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { NavLink } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { TypeAvatar } from "@jitaspace/eve-components";
import { EveIconAvatar } from "@jitaspace/ui";

import type { MarketTreeFilter } from "./filterMarketTree";

/**
 * The whole market tree, served in one document by `/api/market-tree` (see
 * `readMarketTree`). Everything a NavLink renders — including the group icon —
 * comes from here, so expanding the tree never hits the network.
 */
export type MarketGroupIndex = Record<
  number,
  {
    name: string;
    parentMarketGroupId: number | null;
    childrenMarketGroupIds: number[];
    types: { typeId: number; name: string }[];
    iconId: number | null;
  }
>;

interface MarketGroupNavLinkProps {
  marketGroups: MarketGroupIndex;
  marketGroupId: number;
  expand?: boolean;
  /** The sidebar search, or `null` to show everything. */
  filter?: MarketTreeFilter | null;
  /** Open the groups the search lists in `expandedGroupIds`. */
  autoExpand?: boolean;
}

export const MarketGroupNavLink = memo(
  ({
    marketGroups,
    marketGroupId,
    expand: _expand = true,
    filter = null,
    autoExpand = false,
  }: MarketGroupNavLinkProps) => {
    const marketGroup = marketGroups[marketGroupId];
    // Only the initial state: the sidebar remounts the tree when the search
    // changes, and a click still toggles a group the search opened.
    const [opened, { toggle }] = useDisclosure(
      autoExpand && (filter?.expandedGroupIds.has(marketGroupId) ?? false),
    );

    const childrenMarketGroups = useMemo(
      () =>
        (marketGroup?.childrenMarketGroupIds ?? []).flatMap(
          (childMarketGroupId) => {
            const childMarketGroup = marketGroups[childMarketGroupId];
            if (!childMarketGroup) return [];
            if (filter && !filter.visibleGroupIds.has(childMarketGroupId)) {
              return [];
            }
            return [
              {
                marketGroupId: childMarketGroupId,
                ...childMarketGroup,
              },
            ];
          },
        ),
      [marketGroups, marketGroup, filter],
    );

    const sortedChildrenMarketGroups = useMemo(
      () =>
        [...childrenMarketGroups].sort((a, b) => a.name.localeCompare(b.name)),
      [childrenMarketGroups],
    );

    const sortedChildrenTypes = useMemo(
      () =>
        (marketGroup?.types ?? [])
          .filter((type) => !filter || filter.visibleTypeIds.has(type.typeId))
          .sort((a, b) => a.name.localeCompare(b.name)),
      [marketGroup, filter],
    );

    if (marketGroup == undefined) return null;

    return (
      <NavLink
        label={marketGroup.name}
        childrenOffset={28}
        opened={opened}
        onChange={() => toggle()}
        leftSection={
          <EveIconAvatar
            size={24}
            iconId={marketGroup.iconId}
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
              filter={filter}
              autoExpand={autoExpand}
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
