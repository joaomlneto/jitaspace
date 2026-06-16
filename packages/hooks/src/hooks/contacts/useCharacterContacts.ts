"use client";

import { useEffect } from "react";

import type {
  GetCharactersCharacterIdContactsLabelsQueryResponse,
  GetCharactersCharacterIdContactsQueryResponse,
} from "@jitaspace/esi-client";
import {
  getCharactersCharacterIdContacts,
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
          enabled: accessToken !== null,
          initialPageParam: 1,
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

  // fetch everything immediately
  useEffect(() => {
    if (hasNextPage) void fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

  return {
    data: (data?.pages ?? []).flatMap((res) => res.data),
    labels: labels?.data ?? [],
    error,
    isLoading,
    mutate: refetch,
  };
}
