"use client";

import "@eve-online-tools/eve-ship-tree/styles.css";

import type {
  FactionIdentifier,
  FactionSelectorProps,
} from "@eve-online-tools/eve-ship-tree";
import { FactionSelector } from "@eve-online-tools/eve-ship-tree";

import { SHIP_TREE_FACTIONS } from "./factions";

const FACTION_IDS: readonly FactionIdentifier[] = SHIP_TREE_FACTIONS.map(
  (faction) => faction.id,
);

export type ShipTreeFactionSelectorProps = FactionSelectorProps;

/**
 * The library's in-game faction picker: a grid of faction logos, five per row,
 * with arrow-key navigation. Names show only as tooltips and to screen readers,
 * so pair it with a visible label; `onHoverChange` reports the faction under
 * the pointer for previewing its name.
 *
 * Lists the factions in `SHIP_TREE_FACTIONS` order (alphabetical) rather than
 * the library's client order, unless `factions` says otherwise.
 */
export function ShipTreeFactionSelector({
  factions = FACTION_IDS,
  ...props
}: Readonly<ShipTreeFactionSelectorProps>) {
  return <FactionSelector factions={factions} {...props} />;
}
