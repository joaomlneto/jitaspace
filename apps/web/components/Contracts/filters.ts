import type { ContractKind } from "./contract";

/**
 * The filters the contracts browser offers. The page keeps them in the URL
 * (`useContractFilters`) and applies them in the browser (`clientFilter.ts`).
 */

export const CONTRACT_TYPE_FILTERS = [
  "all",
  "item_exchange",
  "auction",
  "courier",
] as const satisfies readonly ("all" | ContractKind)[];
export type ContractTypeFilter = (typeof CONTRACT_TYPE_FILTERS)[number];

export const CONTRACT_SORTS = [
  "newest",
  "oldest",
  "expiring",
  "price-desc",
  "price-asc",
] as const;
export type ContractSort = (typeof CONTRACT_SORTS)[number];

export const CONTRACT_SORT_LABELS: Record<ContractSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  expiring: "Expiring soonest",
  "price-desc": "Highest price",
  "price-asc": "Lowest price",
};

export const PUBLIC_CONTRACTS_PAGE_SIZE = 48;

/** Longest search the box takes; titles themselves cap at 30. */
export const CONTRACT_SEARCH_MAX_LENGTH = 64;

export interface ContractFilters {
  type: ContractTypeFilter;
  regionId: number | null;
  /** Case-insensitive substring of the title or of an item's name. */
  q: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: ContractSort;
  /** 1-based. */
  page: number;
}
