import type { MarketGroupIndex } from "./MarketGroupNavLink";

/** A market group row, as read for the sidebar. */
export interface MarketGroupRow {
  marketGroupId: number;
  name: string;
  parentMarketGroupId: number | null;
  iconId: number | null;
}

/** A type row, as read for the sidebar. */
export interface MarketTypeRow {
  typeId: number;
  name: string;
  marketGroupId: number | null;
}

/**
 * Assemble the sidebar's market tree from two flat reads.
 *
 * Kept separate from the query so the shape can be tested without a database:
 * the alternative is Prisma's nested `children`/`types` relations, which cost
 * two extra `WHERE <fk> IN (…all 2109 market group ids…)` statements and push
 * CockroachDB off the covering index into a full scan of Type. See the index
 * comment on `Type.marketGroupId` in schema.prisma.
 *
 * Rows referencing a market group that isn't in `marketGroups` are dropped
 * rather than creating a placeholder, matching what the relation loads did —
 * `MarketGroupNavLink` renders nothing for an id missing from the index.
 */
export function buildMarketGroupIndex(
  marketGroups: MarketGroupRow[],
  types: MarketTypeRow[],
): MarketGroupIndex {
  const index: MarketGroupIndex = {};

  marketGroups.forEach((marketGroup) => {
    index[marketGroup.marketGroupId] = {
      name: marketGroup.name,
      parentMarketGroupId: marketGroup.parentMarketGroupId,
      childrenMarketGroupIds: [],
      types: [],
      iconId: marketGroup.iconId,
    };
  });

  marketGroups.forEach((marketGroup) => {
    if (marketGroup.parentMarketGroupId === null) return;
    index[marketGroup.parentMarketGroupId]?.childrenMarketGroupIds.push(
      marketGroup.marketGroupId,
    );
  });

  types.forEach((type) => {
    // Narrowed by the query's `not: null` filter; Prisma still types it nullable.
    if (type.marketGroupId === null) return;
    index[type.marketGroupId]?.types.push({
      typeId: type.typeId,
      name: type.name,
    });
  });

  return index;
}
