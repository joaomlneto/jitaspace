import type { ContractSummary } from "./contract";
import type { ContractFilters } from "./filters";
import type { OpenContract } from "./snapshot";
import { contractHeadlineIsk } from "./contract";

/**
 * The contracts browser's filters and sorts, applied in the browser: to the
 * open public contracts (`snapshot.ts`) and to the visitor's own from ESI.
 */

export interface ContractRegionFacet {
  regionId: number;
  name: string;
  count: number;
}

/**
 * Whether a contract matches the filters, apart from the page. `search` is
 * the text the search box matches, lower-case: an open contract's title and
 * item names, or just the title where the items are not known.
 */
export function matchesContractFilters(
  contract: ContractSummary,
  filters: Omit<ContractFilters, "page" | "sort">,
  search: string = contract.title.toLowerCase(),
): boolean {
  if (filters.type !== "all" && contract.type !== filters.type) return false;
  if (filters.regionId !== null && contract.regionId !== filters.regionId) {
    return false;
  }
  if (filters.q && !search.includes(filters.q.toLowerCase())) return false;
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    // The amount the row shows: a "want to buy" exchange is listed at its
    // reward, its price being 0, and an auction at its current bid.
    const { amount } = contractHeadlineIsk(contract);
    if (amount === null) return false;
    if (filters.minPrice !== null && amount < filters.minPrice) return false;
    if (filters.maxPrice !== null && amount > filters.maxPrice) return false;
  }
  return true;
}

/**
 * ISO dates in one format order as strings. A plain comparison, because
 * `localeCompare` is slow enough to notice over 50k contracts.
 */
const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Orders two contracts as the sort says; contracts without an amount last. */
export function compareContracts(
  a: ContractSummary,
  b: ContractSummary,
  sort: ContractFilters["sort"],
): number {
  switch (sort) {
    case "oldest":
      return byString(a.dateIssued, b.dateIssued);
    case "expiring":
      return byString(a.dateExpired, b.dateExpired);
    case "price-desc":
      return (
        (contractHeadlineIsk(b).amount ?? -1) -
        (contractHeadlineIsk(a).amount ?? -1)
      );
    case "price-asc":
      return (
        (contractHeadlineIsk(a).amount ?? Infinity) -
        (contractHeadlineIsk(b).amount ?? Infinity)
      );
    case "newest":
      return byString(b.dateIssued, a.dateIssued);
  }
}

/** The open contracts the filters match, in the order the sort says. */
export function filterOpenContracts(
  contracts: readonly OpenContract[],
  filters: Omit<ContractFilters, "page">,
): ContractSummary[] {
  return contracts
    .filter(({ contract, search }) =>
      matchesContractFilters(contract, filters, search),
    )
    .map(({ contract }) => contract)
    .sort((a, b) => compareContracts(a, b, filters.sort));
}

/**
 * How many open contracts each region would show under the other filters,
 * busiest first: the region picker's counts.
 */
export function regionFacets(
  contracts: readonly OpenContract[],
  filters: Omit<ContractFilters, "page" | "sort">,
): ContractRegionFacet[] {
  const others = { ...filters, regionId: null };
  const facets = new Map<number, ContractRegionFacet>();
  for (const { contract, search } of contracts) {
    if (contract.regionId === null) continue;
    if (!matchesContractFilters(contract, others, search)) continue;
    const facet = facets.get(contract.regionId);
    if (facet) {
      facet.count += 1;
    } else {
      facets.set(contract.regionId, {
        regionId: contract.regionId,
        name: contract.regionName ?? `Region ${contract.regionId}`,
        count: 1,
      });
    }
  }
  return [...facets.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}
