"use client";

import type { DragEvent, ReactNode } from "react";
import { useDeferredValue, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Loader,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import type { MarketTree } from "./readMarketTree";
import type { MarketSidebarView } from "~/lib/quickbar";
import {
  mayBeQuickbarDrag,
  readQuickbarDrag,
  useQuickbarHydrated,
  useQuickbarStore,
} from "~/lib/quickbar";
import { filterMarketTree } from "./filterMarketTree";
import { MarketGroupNavLink } from "./MarketGroupNavLink";
import { Quickbar } from "./Quickbar";

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
 *
 * As in the game's market window, the tree is either the market groups or the
 * reader's quickbar, and the one search box searches whichever is showing.
 */
export function MarketGroupsNavigation() {
  const { data, isError } = useQuery({
    queryKey: ["market-tree"],
    queryFn: fetchMarketTree,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const [query, setQuery] = useState("");
  // Until the stored quickbar is read the market groups show, as they do on
  // the server, so the first client render matches it.
  const hydrated = useQuickbarHydrated();
  const storedView = useQuickbarStore((state) => state.view);
  const view: MarketSidebarView = hydrated ? storedView : "groups";
  const quickbarCount = useQuickbarStore(
    (state) => Object.keys(state.items).length,
  );
  const [dragOverQuickbar, setDragOverQuickbar] = useState(false);
  // Filtering ~22k names is quick, but re-rendering the tree is not: let the
  // input stay responsive while the tree catches up.
  const deferredQuery = useDeferredValue(query);

  const filter = useMemo(
    () => (data ? filterMarketTree(data, deferredQuery) : null),
    [data, deferredQuery],
  );

  // The search box and the tabs show at once: only the market groups need
  // the tree, and the quickbar, kept in this browser, works without it.
  // Only without a tree: a failed background refetch (the provider refetches
  // every query when the ESI language changes) keeps the tree it already has.
  let groupsUnavailable: ReactNode = null;
  if (isError && !data) {
    groupsUnavailable = (
      <Text size="sm" c="dimmed">
        Could not load market groups.
      </Text>
    );
  } else if (!data) {
    groupsUnavailable = <Loader />;
  }

  const allRootMarketGroupIds = data?.rootMarketGroupIds ?? [];
  const rootMarketGroupIds = filter
    ? allRootMarketGroupIds.filter((id) => filter.visibleGroupIds.has(id))
    : allRootMarketGroupIds;
  const autoExpand =
    filter !== null && filter.matchCount <= MAX_AUTO_EXPAND_MATCHES;

  // Drop an item (a market-groups row, or any link to a market page) on the
  // Quickbar tab to add it. One already there stays in its folder.
  const quickbarTabDrop = {
    onDragOver: (event: DragEvent) => {
      if (!mayBeQuickbarDrag(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDragOverQuickbar(true);
    },
    onDragLeave: () => setDragOverQuickbar(false),
    onDrop: (event: DragEvent) => {
      setDragOverQuickbar(false);
      const payload = readQuickbarDrag(event.dataTransfer);
      if (payload?.kind !== "item") return;
      event.preventDefault();
      const store = useQuickbarStore.getState();
      if (!(payload.typeId in store.items)) store.addItem(payload.typeId);
    },
  };

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
          aria-label="Search market"
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
        <Tabs
          value={view}
          onChange={(value) => {
            if (value === "groups" || value === "quickbar") {
              useQuickbarStore.getState().setView(value);
            }
          }}
          mt="xs"
        >
          <Tabs.List grow>
            <Tabs.Tab value="groups">Market groups</Tabs.Tab>
            <Tabs.Tab
              value="quickbar"
              {...quickbarTabDrop}
              data-drop-target={dragOverQuickbar || undefined}
              style={
                dragOverQuickbar
                  ? { background: "var(--mantine-primary-color-light)" }
                  : undefined
              }
              rightSection={
                hydrated && quickbarCount > 0 ? (
                  <Badge size="xs" variant="light" circle={quickbarCount < 10}>
                    {quickbarCount}
                  </Badge>
                ) : null
              }
            >
              Quickbar
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </Box>
      {view === "quickbar" && (
        <Quickbar marketTree={data} query={deferredQuery} />
      )}
      {view === "groups" && groupsUnavailable}
      {view === "groups" && data && (
        <>
          {filter && rootMarketGroupIds.length === 0 && (
            <Text size="sm" c="dimmed">
              No market groups or items match.
            </Text>
          )}
          {filter && !autoExpand && (
            <Text size="xs" c="dimmed" pb="xs">
              {filter.matchCount.toLocaleString()} matches — keep typing to
              expand them.
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
      )}
    </>
  );
}
