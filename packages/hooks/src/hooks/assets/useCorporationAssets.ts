"use client";

import { useMemo } from "react";

import type {
  GetCharactersCharacterIdAssetsQueryResponse,
  GetCorporationsCorporationIdAssetsQueryResponse,
} from "@jitaspace/esi-client";
import {
  getCorporationsCorporationIdAssets,
  useGetCorporationsCorporationIdAssetsInfinite,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { useEagerlyFetchAllPages } from "../utils/useEagerlyFetchAllPages";

export const useCorporationAssets = (corporationId?: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    corporationId,
    scopes: ["esi-assets.read_corporation_assets.v1"],
    roles: ["Director"],
  });

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCorporationsCorporationIdAssetsInfinite(
      corporationId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: corporationId !== undefined && accessToken !== null,
          initialPageParam: 1,
          queryFn: ({ pageParam }) =>
            getCorporationsCorporationIdAssets(
              corporationId ?? 0,
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

  // eagerly load every page so the whole corporation inventory is available
  useEagerlyFetchAllPages({ hasNextPage, fetchNextPage });

  const errorMessage = useMemo(() => {
    if (error) {
      return "Error fetching data";
    }
    if (!corporationId) {
      return "Unable to get corporation ID";
    }
    if (accessToken === null) {
      return "Token not available";
    }
    return null;
  }, [corporationId, error, accessToken]);

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
      GetCorporationsCorporationIdAssetsQueryResponse[number],
      "location_id" | "location_type"
    > & { items: number[] }
  > = useMemo(() => {
    const locationsList = (data?.pages.flat() ?? []).flatMap((res) => res.data);
    const locations: Record<
      string,
      Pick<
        GetCorporationsCorporationIdAssetsQueryResponse[number],
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
    assets,
    locations,
    error,
    errorMessage,
    isLoading,
    mutate: refetch,
  };
};
