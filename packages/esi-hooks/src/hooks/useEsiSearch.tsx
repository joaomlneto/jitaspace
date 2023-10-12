import {
  GetCharactersCharacterIdSearchQueryParamsLanguage,
  useGetCharactersCharacterIdSearch,
  type GetCharactersCharacterIdSearchQueryParamsCategories,
} from "@jitaspace/esi-client-kubb";

import { useEsiClientContext } from "./useEsiClientContext";

export function useEsiSearch({
  query,
  categories,
  strict,
  language,
}: {
  query: string;
  categories: GetCharactersCharacterIdSearchQueryParamsCategories[];
  strict?: boolean;
  language?: GetCharactersCharacterIdSearchQueryParamsLanguage;
}) {
  const { isTokenValid, characterId } = useEsiClientContext();
  return useGetCharactersCharacterIdSearch(
    characterId ?? 1,
    {
      // @ts-expect-error - This is a bug in the generated code
      categories: categories.join(","),
      search: query,
      strict,
      language,
    },
    {},
    {
      query: {
        enabled: isTokenValid && query.length >= 3,
      },
    },
  );
}
