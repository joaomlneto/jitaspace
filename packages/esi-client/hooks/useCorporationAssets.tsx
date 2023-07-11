import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

import { ESI_BASE_URL } from "~/config/constants";
import {
  getGetCorporationsCorporationIdAssetsKey,
  useGetCharactersCharacterId,
  useGetCharactersCharacterIdRoles,
  type GetCorporationsCorporationIdAssets200Item,
} from "../client";
import { useEsiClientContext } from "./useEsiClientContext";

export function useCorporationAssets() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data: characterData } = useGetCharactersCharacterId(
    characterId ?? 0,
    {},
    { swr: { enabled: !!characterId } },
  );

  const { data: characterCorporationRolesData } =
    useGetCharactersCharacterIdRoles(
      characterId ?? 0,
      {},
      {
        swr: {
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
    [characterCorporationRolesData?.data],
  );

  const corporationId = useMemo(
    () => characterData?.data.corporation_id,
    [characterData?.data.corporation_id],
  );

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCorporationsCorporationIdAssets200Item[], Error>(
      function getKey(pageIndex) {
        if (
          !corporationId ||
          !isTokenValid ||
          !scopes.includes("esi-assets.read_corporation_assets.v1") ||
          !scopes.includes("esi-characters.read_corporation_roles.v1") ||
          !isDirector
        ) {
          throw new Error(
            "Insufficient permissions to read corporation assets",
          );
        }

        return () => {
          const [endpointUrl] =
            getGetCorporationsCorporationIdAssetsKey(corporationId);
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

  const errorMessage = useMemo(() => {
    if (error) {
      return error.message;
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
  }, [corporationId, error, isDirector, isTokenValid, scopes]);

  const assets: Record<string, GetCorporationsCorporationIdAssets200Item> =
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
      GetCorporationsCorporationIdAssets200Item,
      "location_id" | "location_type"
    > & { items: number[] }
  > = useMemo(() => {
    const locationsList = data?.flat() ?? [];
    const locations: Record<
      string,
      Pick<
        GetCorporationsCorporationIdAssets200Item,
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
    isValidating,
    mutate,
  };
}
