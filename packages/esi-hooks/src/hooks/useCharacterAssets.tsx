import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

import {
  getGetCharactersCharacterIdAssetsKey,
  type GetCharactersCharacterIdAssetsQueryResponse,
} from "@jitaspace/esi-client-kubb";

import { ESI_BASE_URL } from "../config";
import { useEsiClientContext } from "./useEsiClientContext";

export function useCharacterAssets() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCharactersCharacterIdAssetsQueryResponse[], Error>(
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
          const queryParams = new URLSearchParams();
          queryParams.append("page", `${pageIndex + 1}`);
          return `${ESI_BASE_URL}${endpointUrl}?${queryParams.toString()}`;
        };
      },
      (url: string) =>
        fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((r) => {
          const numPagesString = r.headers.get("x-pages");
          const numPages =
            numPagesString !== null ? parseInt(numPagesString) : undefined;
          if (numPages && numPages !== size) {
            //setNumPages(numPages);
            void setSize(numPages);
          }
          return r.json();
        }),
      { revalidateAll: true },
    );

  const assets: Record<string, GetCharactersCharacterIdAssetsQueryResponse> =
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
      GetCharactersCharacterIdAssetsQueryResponse,
      "location_id" | "location_type"
    > & { items: number[] }
  > = useMemo(() => {
    const locationsList = data?.flat() ?? [];
    const locations: Record<
      string,
      Pick<
        GetCharactersCharacterIdAssetsQueryResponse,
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
    assets,
    locations,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
