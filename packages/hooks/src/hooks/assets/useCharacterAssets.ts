"use client";

import { useEffect, useMemo } from "react";
import { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import {
  getCharactersCharacterIdAssets,
  GetCharactersCharacterIdAssetsQueryResponse,
  useGetCharactersCharacterIdAssetsInfinite,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type CharacterAsset =
  GetCharactersCharacterIdAssetsQueryResponse[number];

export const useCharacterAssets = (characterId?: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-assets.read_assets.v1"],
  });

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCharactersCharacterIdAssetsInfinite(
      characterId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: characterId !== undefined && accessToken !== null,
          queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, any>) =>
            getCharactersCharacterIdAssets(
              characterId ?? 0,
              {
                page: pageParam,
              },
              {},
              { headers: { ...authHeaders } },
            ),
          getNextPageParam: (lastPage, pages) => {
            const numPages: number | undefined = lastPage.headers?.["x-pages"];
            const nextPage = pages.length + 1;
            if (nextPage > (numPages ?? 0)) return undefined;
            return nextPage;
          },
        },
      },
    );

  // fetch everything immediately
  useEffect(() => {
    if (hasNextPage) fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

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
      if (!locations[asset.location_id]) {
        locations[asset.location_id] = {
          location_id: asset.location_id,
          location_type: asset.location_type,
          items: [],
        };
      }

      locations[asset.location_id]?.items.push(asset.item_id);
    });

    return locations;
  }, [data]);

  return {
    hasToken: accessToken !== null,
    assets,
    locations,
    error,
    isLoading,
    mutate: refetch,
  };
};
