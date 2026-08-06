"use client";

import { useMemo } from "react";

import {
  getCharactersCharacterIdMail,
  getCharactersCharacterIdMailInfiniteQueryKey,
  useGetCharactersCharacterIdMailInfinite,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { esiInfiniteQueryKey } from "../utils/esiInfiniteQueryKey";

export function useCharacterMails(characterId?: number, labels: number[] = []) {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-mail.read_mail.v1"],
  });

  // Built from the *infinite* key function, not the single-page one: this is
  // an infinite query, and its entry holds InfiniteData rather than a flat
  // ResponseConfig. See esiInfiniteQueryKey.
  const queryKey = useMemo(
    () =>
      esiInfiniteQueryKey(
        getCharactersCharacterIdMailInfiniteQueryKey(characterId ?? 0, {
          // @ts-expect-error generated code parses this wrong as url param
          labels: labels.join(","),
        }),
      ),
    [characterId, labels, accessToken],
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCharactersCharacterIdMailInfinite(
      characterId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: characterId !== undefined && accessToken !== null,
          queryKey,
          initialPageParam: undefined as number | undefined,
          queryFn: ({ pageParam }) =>
            getCharactersCharacterIdMail(
              characterId ?? 0,
              {
                last_mail_id: pageParam,
                // @ts-expect-error generated code parses this wrong as url param
                labels: labels.join(","),
              },
              { ...authHeaders },
            ),
          getNextPageParam: (lastPage) => {
            if (lastPage.data.length != 50) return undefined;
            return lastPage.data.reduce(
              (acc, msg) => Math.min(acc, msg.mail_id ?? acc),
              Infinity,
            );
          },
        },
      },
    );

  return {
    messages: (data?.pages ?? []).flatMap((res) => res.data),
    hasMoreMessages: hasNextPage,
    loadMoreMessages: fetchNextPage,
    error,
    isLoading,
    mutate: refetch,
  };
}
