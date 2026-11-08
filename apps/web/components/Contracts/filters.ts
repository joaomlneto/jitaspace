import type { ContractKind } from "./contract";

/**
 * The filters the contracts browser offers, shared by the page (which keeps
 * them in the URL) and `/api/contracts` (which applies the public ones in SQL),
 * so the two cannot disagree on a name or a default.
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

/** Longest title search the API accepts; titles themselves cap at 30. */
export const CONTRACT_SEARCH_MAX_LENGTH = 64;

/**
 * Deepest page the API serves. About 50k contracts are open at a time, or
 * ~1,100 pages; past this, every request would only sort the whole set to
 * return nothing.
 */
export const PUBLIC_CONTRACTS_MAX_PAGE = 2_000;

/** Region and contract ids are Postgres `integer`s; larger ones cannot exist. */
const INT4_MAX = 2_147_483_647;

export interface ContractFilters {
  type: ContractTypeFilter;
  regionId: number | null;
  /** Case-insensitive substring of the title. */
  q: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: ContractSort;
  /** 1-based. */
  page: number;
}

function positiveInt(raw: string | null, max = INT4_MAX): number | null {
  if (raw === null || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  const value = Number(raw);
  return value <= max ? value : null;
}

function nonNegativeNumber(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function oneOf<T extends string>(
  values: readonly T[],
  raw: string | null,
  fallback: T,
): T {
  return values.find((value) => value === raw) ?? fallback;
}

/** Parse the URL's filters, dropping anything malformed back to its default. */
export function parseContractFilters(params: URLSearchParams): ContractFilters {
  return {
    type: oneOf(CONTRACT_TYPE_FILTERS, params.get("type"), "all"),
    regionId: positiveInt(params.get("region")),
    q: (params.get("q") ?? "").trim().slice(0, CONTRACT_SEARCH_MAX_LENGTH),
    minPrice: nonNegativeNumber(params.get("minPrice")),
    maxPrice: nonNegativeNumber(params.get("maxPrice")),
    sort: oneOf(CONTRACT_SORTS, params.get("sort"), "newest"),
    page: positiveInt(params.get("page"), PUBLIC_CONTRACTS_MAX_PAGE) ?? 1,
  };
}

/** The query string `/api/contracts` expects, without defaults. */
export function contractFiltersQuery(filters: ContractFilters): string {
  const params = new URLSearchParams();
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.regionId !== null) params.set("region", `${filters.regionId}`);
  if (filters.q) params.set("q", filters.q);
  if (filters.minPrice !== null) params.set("minPrice", `${filters.minPrice}`);
  if (filters.maxPrice !== null) params.set("maxPrice", `${filters.maxPrice}`);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page !== 1) params.set("page", `${filters.page}`);
  return params.toString();
}
