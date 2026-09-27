"use client";

import type {
  GetCharactersCharacterIdContactsLabelsQueryResponse,
  GetCharactersCharacterIdContactsQueryResponse,
} from "@jitaspace/esi-client";
import {
  getCharactersCharacterIdContacts,
  getCharactersCharacterIdContactsInfiniteQueryKey,
  useGetCharactersCharacterIdContactsInfinite,
  useGetCharactersCharacterIdContactsLabels,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { esiInfiniteQueryKey } from "../utils/esiQueryKeys";
import {
  EAGER_WALK_STALE_TIME_MS,
  useEagerlyFetchAllPages,
} from "../utils/useEagerlyFetchAllPages";

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
    characterId,
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
      characterId,
      {},
      { ...authHeaders },
      {
        query: {
          // Keep this entry distinct from the single-page query for the
          // same endpoint; see esiInfiniteQueryKey.
          queryKey: esiInfiniteQueryKey(
            getCharactersCharacterIdContactsInfiniteQueryKey(characterId),
          ),
          enabled: accessToken !== null,
          initialPageParam: 1,
          staleTime: EAGER_WALK_STALE_TIME_MS,
          queryFn: ({ pageParam }) =>
            getCharactersCharacterIdContacts(
              characterId,
              {
                page: pageParam,
              },
              { ...authHeaders },
            ),
          getNextPageParam: (lastPage, pages) => {
            const xPages: unknown = lastPage.headers["x-pages"];
            const numPages = typeof xPages === "string" ? Number(xPages) : 0;
            const nextPage = pages.length + 1;
            if (nextPage > numPages) return undefined;
            return nextPage;
          },
        },
      },
    );

  useEagerlyFetchAllPages({ data, error, hasNextPage, fetchNextPage });

  return {
    data: (data?.pages ?? []).flatMap((res) => res.data),
    labels: labels?.data ?? [],
    error,
    isLoading,
    mutate: refetch,
  };
}
