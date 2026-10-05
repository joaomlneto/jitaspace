/**
 * The market sidebar's tree, as `/api/market-tree` serves it. Types only, so
 * both the components that render it and the quickbar (in lib) can share them
 * without lib depending on a component module.
 */

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

/** The market sidebar's whole tree, as served by `/api/market-tree`. */
export interface MarketTree {
  /** Top-level market groups, sorted by name. */
  rootMarketGroupIds: number[];
  marketGroups: MarketGroupIndex;
}
