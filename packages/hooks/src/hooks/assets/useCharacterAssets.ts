"use client";

import { useMemo } from "react";

import type { GetCharactersCharacterIdAssetsQueryResponse } from "@jitaspace/esi-client";
import {
  getCharactersCharacterIdAssets,
  getCharactersCharacterIdAssetsInfiniteQueryKey,
  useGetCharactersCharacterIdAssetsInfinite,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { esiInfiniteQueryKey } from "../utils/esiQueryKeys";
import {
  EAGER_WALK_STALE_TIME_MS,
  useEagerlyFetchAllPages,
} from "../utils/useEagerlyFetchAllPages";

export type CharacterAsset =
  GetCharactersCharacterIdAssetsQueryResponse[number];

/**
 * @param options.enabled - false holds the (eager, every-page) asset walk
 *   while still reporting `hasToken`, so a caller can offer a feature before
 *   fetching what it needs. Default true.
 */
export const useCharacterAssets = (
  characterId?: number,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-assets.read_assets.v1"],
  });

  const queryEnabled =
    enabled && characterId !== undefined && accessToken !== null;

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCharactersCharacterIdAssetsInfinite(
      characterId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          // Keep this entry distinct from the single-page query for the
          // same endpoint; see esiInfiniteQueryKey.
          queryKey: esiInfiniteQueryKey(
            getCharactersCharacterIdAssetsInfiniteQueryKey(characterId ?? 0),
          ),
          enabled: queryEnabled,
          initialPageParam: 1,
          staleTime: EAGER_WALK_STALE_TIME_MS,
          queryFn: ({ pageParam }) =>
            getCharactersCharacterIdAssets(
              characterId ?? 0,
              {
                page: pageParam,
              },
              { ...authHeaders },
            ),
          getNextPageParam: (lastPage, pages) => {
            const xPages: unknown = lastPage.headers["x-pages"];
            const numPages = typeof xPages === "string" ? Number(xPages) : 0;
            const nextPage = pages.length + 1;
            if (nextPage > numPages) return undefined;
            return nextPage;
          },
        },
      },
    );

  useEagerlyFetchAllPages({
    data,
    error,
    hasNextPage,
    fetchNextPage,
    enabled: queryEnabled,
  });

  const assets: Record<
    string,
    GetCharactersCharacterIdAssetsQueryResponse[number]
  > = useMemo(() => {
    const assetsList = (data?.pages.flat() ?? []).flatMap(
      (entry) => entry.data,
    );
    const assets = {};

    assetsList.forEach((asset) => {
      // @ts-expect-error: item_id is fine to use as index...
      assets[asset.item_id] = asset;
    });

    return assets;
  }, [data]);

  const locations: Record<
    string,
    Pick<
      GetCharactersCharacterIdAssetsQueryResponse[number],
      "location_id" | "location_type"
    > & { items: number[] }
  > = useMemo(() => {
    const locationsList = (data?.pages.flat() ?? []).flatMap((res) => res.data);
    const locations: Record<
      string,
      Pick<
        GetCharactersCharacterIdAssetsQueryResponse[number],
        "location_id" | "location_type"
      > & { items: number[] }
    > = {};

    locationsList.forEach((asset) => {
      const existing = locations[asset.location_id];
      if (existing) {
        existing.items.push(asset.item_id);
      } else {
        locations[asset.location_id] = {
          location_id: asset.location_id,
          location_type: asset.location_type,
          items: [asset.item_id],
        };
      }
    });

    return locations;
  }, [data]);

  return {
    hasToken: accessToken !== null,
    assets,
    locations,
    error,
    isLoading,
    /**
     * Whether any page has loaded. Empty `assets` alone cannot tell a character
     * with no assets from a walk that has not started (or is held by
     * `enabled: false`).
     */
    hasData: data !== undefined,
    /**
     * Whether pages are still outstanding.
     *
     * `isLoading` only covers the *first* page: react-query settles the query
     * once page one lands, and `useEagerlyFetchAllPages` then walks the rest
     * with `fetchNextPage`, which reports through `isFetchingNextPage` instead.
     * A consumer that needs the whole collection — rather than whatever has
     * arrived so far — has to wait on this too. It stays `true` after a page
     * fails, so pair it with `error`.
     */
    hasNextPage,
    mutate: refetch,
  };
};
