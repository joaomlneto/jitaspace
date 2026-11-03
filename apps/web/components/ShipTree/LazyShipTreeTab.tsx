"use client";

import dynamic from "next/dynamic";
import { Skeleton, Stack } from "@mantine/core";

import { SHIP_TREE_TAB_HEIGHT, SHIP_TREE_TAB_MIN_HEIGHT } from "./constants";

/**
 * The Ship Tree tab, browser-only and on demand: the ship tree library and its
 * stylesheet load when the tab opens, and stay out of the page's cached HTML.
 *
 * Import it from this file, not from `~/components/ShipTree`: that index
 * re-exports `ShipTreePanel`, which would put the library in the page's bundle.
 */
const loadShipTreeTab = () => import("./ShipTreeTab");

/**
 * Starts loading the tab before it opens: its code (the same chunk the tab
 * itself loads) and the tree's status sprites, so neither pops in on click.
 * For the tab's hover and focus. Safe to call repeatedly; a failure here is
 * only a missed head start, and the tab's own load reports it.
 */
export function preloadShipTreeTab(): void {
  loadShipTreeTab()
    .then((tab) => tab.preloadShipTreeSprites())
    .catch(() => undefined);
}

export const LazyShipTreeTab = dynamic(loadShipTreeTab, {
  ssr: false,
  // The panel's own shape (controls, tree, credit line), so nothing below it
  // moves when the tree arrives.
  loading: () => (
    <Stack gap="md" data-testid="ship-tree-placeholder">
      {/* Measured: the controls row with the logged-out skills prompt. */}
      <Skeleton h={56} radius="sm" />
      <Skeleton
        h={SHIP_TREE_TAB_HEIGHT}
        mih={SHIP_TREE_TAB_MIN_HEIGHT}
        radius="md"
      />
      <Skeleton h={17} w="60%" radius="sm" />
    </Stack>
  ),
});
