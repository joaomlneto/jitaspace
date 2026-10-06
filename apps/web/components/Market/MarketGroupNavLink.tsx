"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Menu, NavLink } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconExternalLink,
  IconLink,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";

import { TypeAvatar } from "@jitaspace/eve-components";
import { EveIconAvatar } from "@jitaspace/ui";

import type { MarketTreeFilter } from "./filterMarketTree";
import type { MarketGroupIndex } from "~/lib/marketTree";
import { useQuickbarStore } from "~/lib/quickbar";

export type { MarketGroupIndex } from "~/lib/marketTree";

interface MarketGroupNavLinkProps {
  marketGroups: MarketGroupIndex;
  marketGroupId: number;
  expand?: boolean;
  /** The sidebar search, or `null` to show everything. */
  filter?: MarketTreeFilter | null;
  /** Open the groups the search lists in `expandedGroupIds`. */
  autoExpand?: boolean;
}

/**
 * An item in the tree. Right-click it to add it to (or take it off) the
 * quickbar, as in the game client, or to open or copy its link as the
 * browser's own menu would; a star marks one already on the quickbar.
 */
const MarketTypeNavLink = memo(
  ({ typeId, name }: { typeId: number; name: string }) => {
    const inQuickbar = useQuickbarStore((state) => typeId in state.items);

    return (
      <Menu position="bottom-start" withinPortal>
        <Menu.ContextMenu>
          <NavLink
            component={Link}
            href={`/market/${typeId}`}
            leftSection={
              <TypeAvatar size={24} typeId={typeId} variation="icon" />
            }
            label={name}
            rightSection={
              inQuickbar ? (
                <IconStarFilled
                  size={14}
                  color="var(--mantine-color-yellow-5)"
                  aria-label="On your quickbar"
                />
              ) : null
            }
          />
        </Menu.ContextMenu>
        <Menu.Dropdown>
          {/* The right-click replaces the browser's own menu here, so carry
              its two entries people reach for on a link. */}
          <Menu.Item
            component="a"
            href={`/market/${typeId}`}
            target="_blank"
            rel="noopener"
            leftSection={<IconExternalLink size={16} />}
          >
            Open in new tab
          </Menu.Item>
          <Menu.Item
            leftSection={<IconLink size={16} />}
            onClick={() =>
              void navigator.clipboard.writeText(
                new URL(`/market/${typeId}`, window.location.origin).href,
              )
            }
          >
            Copy link
          </Menu.Item>
          <Menu.Divider />
          {inQuickbar ? (
            <Menu.Item
              leftSection={<IconStar size={16} />}
              onClick={() => useQuickbarStore.getState().removeItem(typeId)}
            >
              Remove from quickbar
            </Menu.Item>
          ) : (
            <Menu.Item
              leftSection={<IconStarFilled size={16} />}
              onClick={() => useQuickbarStore.getState().addItem(typeId)}
            >
              Add to quickbar
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    );
  },
);
MarketTypeNavLink.displayName = "MarketTypeNavLink";

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
            <MarketTypeNavLink
              typeId={type.typeId}
              name={type.name}
              key={type.typeId}
            />
          ))}
      </NavLink>
    );
  },
);
MarketGroupNavLink.displayName = "MarketGroupNavLink";
