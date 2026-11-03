"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  GetCorporationsCorporationIdCustomsOfficesQueryResponse,
  ResponseConfig,
  ResponseErrorConfig,
} from "@jitaspace/esi-client";
import {
  getCorporationsCorporationIdCustomsOffices,
  getCorporationsCorporationIdCustomsOfficesQueryKey,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { esiPagedQueryOptions } from "../multi";
import { CUSTOMS_OFFICES_SCOPE } from "./scopes";

/** One customs office a corporation owns, with its tax and access settings. */
export type CustomsOffice =
  GetCorporationsCorporationIdCustomsOfficesQueryResponse[number];

/**
 * Every page of a corporation's customs offices, built so the single- and
 * multi-subject hooks share one cache entry.
 */
export const corporationCustomsOfficesQueryOptions = (
  corporationId: number,
  authHeaders: Record<string, string>,
) =>
  esiPagedQueryOptions({
    queryKey: getCorporationsCorporationIdCustomsOfficesQueryKey(corporationId),
    fetchPage: (page, signal) =>
      getCorporationsCorporationIdCustomsOffices(
        corporationId,
        { page },
        authHeaders,
        { signal },
      ),
  });

/**
 * Every customs office a corporation owns, across all pages. ESI only answers
 * a Director's token.
 *
 * For several corporations at once, use `useMultipleCorporationCustomsOffices`
 * (every reachable corporation, or `{ subjectIds }` for a chosen few): it
 * shares this hook's cache entries.
 */
export const useCorporationCustomsOffices = (corporationId?: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    corporationId,
    scopes: [CUSTOMS_OFFICES_SCOPE],
    roles: ["Director"],
  });

  const { queryKey, queryFn, retry } = corporationCustomsOfficesQueryOptions(
    corporationId ?? 0,
    authHeaders,
  );

  return {
    hasToken: accessToken !== null,
    ...useQuery<ResponseConfig<CustomsOffice[]>, ResponseErrorConfig<Error>>({
      queryKey,
      queryFn,
      retry,
      enabled: !!corporationId && accessToken !== null,
    }),
  };
};
