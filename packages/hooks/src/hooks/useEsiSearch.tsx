import { useMemo } from "react";

import {
  GetCharactersCharacterIdSearchQueryParamsLanguage,
  GetCharactersCharacterIdSearchQueryResponse,
  useGetCharactersCharacterIdSearch,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "./useEsiClientContext";

export type EsiSearchCategory =
  keyof GetCharactersCharacterIdSearchQueryResponse;

export function useEsiSearch(
  query: string,
  {
    categories,
    strict,
    language,
  }: {
    categories?: EsiSearchCategory[];
    strict?: boolean;
    language?: GetCharactersCharacterIdSearchQueryParamsLanguage;
  } = {},
) {
  const { isTokenValid, characterId, accessToken, scopes } =
    useEsiClientContext();

  const canSearchStructures = useMemo(
    () => scopes.includes("esi-universe.read_structures.v1"),
    [scopes],
  );

  const searchResult = useGetCharactersCharacterIdSearch(
    characterId ?? 1,
    {
      // @ts-expect-error - This is a bug in the generated code
      categories: categories?.join(",") ?? [
        "agent",
        "alliance",
        "character",
        "constellation",
        "corporation",
        "faction",
        "inventory_type",
        "region",
        "solar_system",
        "station",
        ...((canSearchStructures ? ["structure"] : []) as EsiSearchCategory[]),
      ],
      search: query,
      strict,
      language,
      token: accessToken,
    },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          query.length >= 3 &&
          scopes.includes("esi-search.search_structures.v1"),
      },
    },
  );

  return { ...searchResult, canSearchStructures };
}
