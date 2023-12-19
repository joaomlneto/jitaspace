import {
  GetCharactersCharacterIdSearchQueryParamsLanguage,
  GetCharactersCharacterIdSearchQueryResponse,
  useGetCharactersCharacterIdSearch,
} from "@jitaspace/esi-client";

import { useAccessToken } from "./auth";

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
  const { character, accessToken, authHeaders } = useAccessToken({
    scopes: ["esi-search.search_structures.v1"],
  });

  const searchResult = useGetCharactersCharacterIdSearch(
    character?.characterId ?? 0,
    {
      // @ts-expect-error - This is a bug in the generated code
      categories: (
        categories ?? [
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
          "structure",
        ]
      )?.join(","),
      search: query,
      strict,
      language,
    },
    { ...authHeaders },
    {
      query: {
        enabled: accessToken !== null && query.length >= 3,
      },
    },
  );

  return { ...searchResult, canSearchStructures: accessToken !== null };
}
