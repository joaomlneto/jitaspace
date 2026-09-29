"use client";

import { Loader, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { MarketTree } from "./readMarketTree";
import { MarketGroupNavLink } from "./MarketGroupNavLink";

async function fetchMarketTree(): Promise<MarketTree> {
  const response = await fetch("/api/market-tree");
  if (!response.ok) {
    throw new Error(`Failed to load the market tree: ${response.status}`);
  }
  return (await response.json()) as MarketTree;
}

/**
 * The market sidebar. Its tree is fetched from `/api/market-tree` — one
 * CDN-served document — rather than read on the server while rendering each
 * market page: see `readMarketTree` for why. The tree only changes with a new
 * SDE build, so it is fetched once per session and kept across market pages.
 */
export function MarketGroupsNavigation() {
  const { data, isError } = useQuery({
    queryKey: ["market-tree"],
    queryFn: fetchMarketTree,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (isError) {
    return (
      <Text size="sm" c="dimmed">
        Could not load market groups.
      </Text>
    );
  }
  if (!data) return <Loader />;

  return (
    <>
      {data.rootMarketGroupIds.map((marketGroupId) => (
        <MarketGroupNavLink
          marketGroups={data.marketGroups}
          marketGroupId={marketGroupId}
          key={marketGroupId}
        />
      ))}
    </>
  );
}
