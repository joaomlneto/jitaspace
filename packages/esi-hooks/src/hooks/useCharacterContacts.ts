import { useEffect } from "react";
import { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import {
  getCharactersCharacterIdContacts,
  useGetCharactersCharacterIdContactsInfinite,
  useGetCharactersCharacterIdContactsLabels,
} from "@jitaspace/esi-client-kubb";

import { useEsiClientContext } from "./useEsiClientContext";

export function useCharacterContacts() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data: labels } = useGetCharactersCharacterIdContactsLabels(
    characterId ?? 0,
    {},
    {},
    {
      query: {
        enabled:
          !!characterId &&
          isTokenValid &&
          scopes.includes("esi-characters.read_contacts.v1"),
        refetchOnWindowFocus: false,
      },
    },
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCharactersCharacterIdContactsInfinite(
      characterId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled:
            characterId !== undefined &&
            isTokenValid &&
            scopes.includes("esi-characters.read_contacts.v1"),
          queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, any>) =>
            getCharactersCharacterIdContacts(characterId ?? 0, {
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
