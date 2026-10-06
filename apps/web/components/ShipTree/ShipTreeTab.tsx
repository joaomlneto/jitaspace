"use client";

import { Switch } from "@mantine/core";
import { parseAsBoolean, useQueryState } from "nuqs";

import type { FactionIdentifier } from "@jitaspace/ship-tree";

import {
  SHIP_TREE_OMEGA_PARAM,
  SHIP_TREE_TAB_HEIGHT,
  SHIP_TREE_TAB_MIN_HEIGHT,
} from "./constants";
import { ShipTreePanel } from "./ShipTreePanel";

/**
 * The Ship Tree tab of the faction and race pages. Its own module so a page can
 * load it lazily, through `LazyShipTreeTab`: the tree library and its
 * stylesheet only reach the browser when the tab is opened, and never the
 * page's cached HTML.
 */
export default function ShipTreeTab({
  faction,
}: Readonly<{ faction: FactionIdentifier }>) {
  // In the URL, as on /ship-tree, so a link keeps the clone state. The page
  // clears it when another tab opens.
  const [isOmega, setIsOmega] = useQueryState(
    SHIP_TREE_OMEGA_PARAM,
    parseAsBoolean.withDefault(false),
  );

  return (
    <ShipTreePanel
      faction={faction}
      isOmega={isOmega}
      controls={
        <Switch
          label="Omega clone"
          checked={isOmega}
          onChange={(event) => {
            void setIsOmega(event.currentTarget.checked);
          }}
        />
      }
      h={SHIP_TREE_TAB_HEIGHT}
      mih={SHIP_TREE_TAB_MIN_HEIGHT}
    />
  );
}
