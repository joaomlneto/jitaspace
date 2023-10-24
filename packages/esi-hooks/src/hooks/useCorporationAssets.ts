import { useMemo } from "react";
import { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import {
  GetCharactersCharacterIdAssetsQueryResponse,
  getCorporationsCorporationIdAssets,
  GetCorporationsCorporationIdAssetsQueryResponse,
  useGetCharactersCharacterId,
  useGetCharactersCharacterIdRoles,
  useGetCorporationsCorporationIdAssetsInfinite,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "./useEsiClientContext";

export function useCorporationAssets() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data: characterData } = useGetCharactersCharacterId(
    characterId ?? 0,
    {},
    {},
    { query: { enabled: !!characterId } },
  );

  const { data: characterCorporationRolesData } =
    useGetCharactersCharacterIdRoles(
      characterId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled:
            !!characterId &&
            isTokenValid &&
            scopes.includes("esi-characters.read_corporation_roles.v1"),
        },
      },
    );

  const isDirector = useMemo(
    () =>
      Object.values(characterCorporationRolesData?.data ?? {}).some((e) =>
        e.includes("Director"),
      ),
    [characterCorporationRolesData],
  );

  const corporationId = useMemo(
    () => characterData?.data.corporation_id ?? null,
    [characterData?.data.corporation_id],
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCorporationsCorporationIdAssetsInfinite(
      corporationId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled:
            corporationId !== undefined &&
            isTokenValid &&
            scopes.includes("esi-assets.read_corporation_assets.v1") &&
            scopes.includes("esi-characters.read_corporation_roles.v1") &&
            isDirector,
          queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, any>) =>
            getCorporationsCorporationIdAssets(corporationId ?? 0, {
              page: pageParam,
              token: accessToken,
            }),
          getNextPageParam: (lastPage, pages) => {
            const numPages: number | undefined = lastPage.headers?.["x-pages"];
            const nextPage = pages.length + 1;
            if (nextPage > (numPages ?? 0)) return undefined;
            return nextPage;
          },
        },
      },
    );

  const errorMessage = useMemo(() => {
    if (error) {
      return "Error fetching data";
    }
    if (!corporationId) {
      return "Unable to get corporation ID";
    }
    if (!isTokenValid) {
      return "Invalid token";
    }
    if (!scopes.includes("esi-assets.read_corporation_assets.v1")) {
      return "Insufficient permissions to read corporation assets";
    }
    if (!scopes.includes("esi-characters.read_corporation_roles.v1")) {
      return "Insufficient permissions to read corporation roles";
    }
    if (!isDirector) {
      return "Character must have the corporation role of Director.";
    }
    return null;
  }, [corporationId, error, isDirector, isTokenValid, scopes]);

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
    errorMessage,
    isLoading,
    mutate: refetch,
  };
}
