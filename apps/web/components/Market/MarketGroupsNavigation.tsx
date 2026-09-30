"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ActionIcon, Box, Loader, Text, TextInput } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import type { MarketTree } from "./readMarketTree";
import { filterMarketTree } from "./filterMarketTree";
import { MarketGroupNavLink } from "./MarketGroupNavLink";

/**
 * Past this many matching names the search only filters the tree, leaving the
 * groups closed: opening every match for a one- or two-letter query would
 * render thousands of rows at once.
 */
const MAX_AUTO_EXPAND_MATCHES = 200;

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
 *
 * The search is local state rather than a URL parameter: the sidebar lives in
 * the market layout, so it survives clicking through to an item, where a query
 * parameter would be dropped by every sidebar link.
 */
export function MarketGroupsNavigation() {
  const { data, isError } = useQuery({
    queryKey: ["market-tree"],
    queryFn: fetchMarketTree,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const [query, setQuery] = useState("");
  // Filtering ~22k names is quick, but re-rendering the tree is not: let the
  // input stay responsive while the tree catches up.
  const deferredQuery = useDeferredValue(query);

  const filter = useMemo(
    () => (data ? filterMarketTree(data, deferredQuery) : null),
    [data, deferredQuery],
  );

  // Only without a tree: a failed background refetch (the provider refetches
  // every query when the ESI language changes) keeps the tree it already has.
  if (isError && !data) {
    return (
      <Text size="sm" c="dimmed">
        Could not load market groups.
      </Text>
    );
  }
  if (!data) return <Loader />;

  const rootMarketGroupIds = filter
    ? data.rootMarketGroupIds.filter((id) => filter.visibleGroupIds.has(id))
    : data.rootMarketGroupIds;
  const autoExpand =
    filter !== null && filter.matchCount <= MAX_AUTO_EXPAND_MATCHES;

  return (
    <>
      <Box
        pb="xs"
        bg="var(--mantine-color-body)"
        style={{ position: "sticky", top: 0, zIndex: 1 }}
      >
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search market…"
          aria-label="Search market groups and items"
          leftSection={<IconSearch size={16} />}
          rightSection={
            query ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <IconX size={16} />
              </ActionIcon>
            ) : null
          }
        />
      </Box>
      {filter && rootMarketGroupIds.length === 0 && (
        <Text size="sm" c="dimmed">
          No market groups or items match.
        </Text>
      )}
      {filter && !autoExpand && (
        <Text size="xs" c="dimmed" pb="xs">
          {filter.matchCount.toLocaleString()} matches — keep typing to expand
          them.
        </Text>
      )}
      {/* Keyed on the query so each search starts from its own open state. */}
      <div key={deferredQuery}>
        {rootMarketGroupIds.map((marketGroupId) => (
          <MarketGroupNavLink
            marketGroups={data.marketGroups}
            marketGroupId={marketGroupId}
            filter={filter}
            autoExpand={autoExpand}
            key={marketGroupId}
          />
        ))}
      </div>
    </>
  );
}
