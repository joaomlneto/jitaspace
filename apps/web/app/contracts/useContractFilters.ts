"use client";

import { useMemo } from "react";
import {
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";

import type { ContractFilters } from "~/components/Contracts/filters";
import {
  CONTRACT_SORTS,
  CONTRACT_TYPE_FILTERS,
} from "~/components/Contracts/filters";

/**
 * The contracts browser's filters, kept in the URL so a filtered view can be
 * shared. The names match what `/api/contracts` reads (`parseContractFilters`),
 * so the page forwards its own query string's meaning unchanged.
 */
const parsers = {
  type: parseAsStringLiteral(CONTRACT_TYPE_FILTERS).withDefault("all"),
  region: parseAsInteger,
  q: parseAsString.withDefault(""),
  minPrice: parseAsFloat,
  maxPrice: parseAsFloat,
  sort: parseAsStringLiteral(CONTRACT_SORTS).withDefault("newest"),
  page: parseAsInteger.withDefault(1),
};

const urlOptions = { history: "replace" as const };

export type ContractFilterUpdate = Partial<{
  type: ContractFilters["type"];
  region: number | null;
  q: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: ContractFilters["sort"];
  page: number;
}>;

export function useContractFilters() {
  const [state, setState] = useQueryStates(parsers, urlOptions);

  const filters: ContractFilters = useMemo(
    () => ({
      type: state.type,
      regionId: state.region !== null && state.region > 0 ? state.region : null,
      q: state.q.trim(),
      minPrice:
        state.minPrice !== null && state.minPrice >= 0 ? state.minPrice : null,
      maxPrice:
        state.maxPrice !== null && state.maxPrice >= 0 ? state.maxPrice : null,
      sort: state.sort,
      page: Math.max(1, state.page),
    }),
    [state],
  );

  /** Update filters; any change but the page itself returns to page 1. */
  const update = (changes: ContractFilterUpdate) => {
    void setState({ page: null, ...changes });
  };

  const reset = () => {
    void setState(null);
  };

  return { filters, update, reset };
}
