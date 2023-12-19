import { useEffect } from "react";
import { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import {
  getCharactersCharacterIdContacts,
  GetCharactersCharacterIdContactsLabelsQueryResponse,
  GetCharactersCharacterIdContactsQueryResponse,
  useGetCharactersCharacterIdContactsInfinite,
  useGetCharactersCharacterIdContactsLabels,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type CharacterContact =
  GetCharactersCharacterIdContactsQueryResponse[number];

export type CharacterContactLabel =
  GetCharactersCharacterIdContactsLabelsQueryResponse[number];

export function useCharacterContacts(characterId: number) {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-characters.read_contacts.v1"],
  });

  const { data: labels } = useGetCharactersCharacterIdContactsLabels(
    characterId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: !!characterId && accessToken !== null,
        refetchOnWindowFocus: false,
      },
    },
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCharactersCharacterIdContactsInfinite(
      characterId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: characterId !== undefined && accessToken !== null,
          queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, any>) =>
            getCharactersCharacterIdContacts(
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

  return {
    data: (data?.pages ?? []).flatMap((res) => res.data ?? []),
    labels: labels?.data ?? [],
    error,
    isLoading,
    mutate: refetch,
  };
}
