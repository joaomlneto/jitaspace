import {
  useGetCharactersCharacterIdSearch,
  type GetCharactersCharacterIdSearchCategoriesItem,
  type LanguageParameter,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "./useEsiClientContext";

export function useEsiSearch({
  query,
  categories,
  strict,
  language,
}: {
  query: string;
  categories: GetCharactersCharacterIdSearchCategoriesItem[];
  strict?: boolean;
  language?: LanguageParameter;
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
    {
      swr: {
        enabled: isTokenValid && query.length >= 3,
      },
    },
  );
}
