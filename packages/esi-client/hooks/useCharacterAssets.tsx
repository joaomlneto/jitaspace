import { useEffect, useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";

import { ESI_BASE_URL } from "~/config/constants";
import {
  getGetCharactersCharacterIdAssetsKey,
  type GetCharactersCharacterIdAssets200Item,
  type GetCharactersCharacterIdAssetsParams,
} from "../client";
import { useEsiClientContext } from "./useEsiClientContext";

export function useCharacterAssets() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const [numPages, setNumPages] = useState(1);

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCharactersCharacterIdAssets200Item[], Error>(
      function getKey(pageIndex) {
        if (
          !characterId ||
          !isTokenValid ||
          !scopes.includes("esi-assets.read_assets.v1")
        ) {
          throw new Error("Insufficient permissions to read character assets");
        }

        return () => {
          const [endpointUrl] =
            getGetCharactersCharacterIdAssetsKey(characterId);
          const params: GetCharactersCharacterIdAssetsParams = {
            page: pageIndex + 1,
          };
          return `${ESI_BASE_URL}${endpointUrl}`;
        };
      },
      (url: string) =>
        fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((r) => {
          const numPages = r.headers.get("x-pages");
          if (numPages) {
            setNumPages(parseInt(numPages));
          }
          return r.json();
        }),
      { revalidateAll: true },
    );

  useEffect(() => {
    if (numPages) {
      void setSize(numPages);
    }
  }, [numPages, setSize]);

  const assets: Record<string, GetCharactersCharacterIdAssets200Item> =
    useMemo(() => {
      const assetsList = data?.flat() ?? [];
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
      GetCharactersCharacterIdAssets200Item,
      "location_id" | "location_type"
    > & { items: number[] }
  > = useMemo(() => {
    const locationsList = data?.flat() ?? [];
    const locations = {};

    locationsList.forEach((asset) => {
      // @ts-expect-error: item_id is fine to use as index...
      if (!locations[asset.location_id]) {
        // @ts-expect-error: item_id is fine to use as index...
        locations[asset.location_id] = {
          location_id: asset.location_id,
          location_type: asset.location_type,
          items: [],
        };
      }
      // @ts-expect-error: item_id is fine to use as index...
      locations[asset.location_id]?.items.push(asset.item_id);
    });

    return locations;
  }, [data]);

  return {
    assets,
    locations,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
