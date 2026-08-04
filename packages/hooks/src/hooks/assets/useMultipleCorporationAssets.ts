"use client";

import {
  getCorporationsCorporationIdAssets,
  getCorporationsCorporationIdAssetsQueryKey,
} from "@jitaspace/esi-client";

import { defineMultiEsiQuery, esiPagedQueryOptions } from "../multi";

/**
 * Assets for every corporation the logged-in characters can read, across all
 * pages.
 *
 * Proves the paginated + corporation path: the subject is a corporation, but
 * the token comes from a character who belongs to it, and the whole collection
 * is fetched as one query rather than an infinite one.
 */
export const useMultipleCorporationAssets = defineMultiEsiQuery({
  kind: "corporation",
  scopes: ["esi-assets.read_corporation_assets.v1"],
  roles: ["Director"],
  query: (corporationId, authHeaders) =>
    esiPagedQueryOptions({
      queryKey: getCorporationsCorporationIdAssetsQueryKey(corporationId),
      fetchPage: (page, signal) =>
        getCorporationsCorporationIdAssets(
          corporationId,
          { page },
          authHeaders,
          { signal },
        ),
    }),
});
