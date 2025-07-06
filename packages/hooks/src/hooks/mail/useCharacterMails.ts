"use client";

import { useMemo } from "react";

import {
  getCharactersCharacterIdMail,
  getCharactersCharacterIdMailQueryKey,
  useGetCharactersCharacterIdMailInfinite,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export function useCharacterMails(characterId?: number, labels: number[] = []) {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-mail.read_mail.v1"],
  });

  const queryKey = useMemo(
    () =>
      getCharactersCharacterIdMailQueryKey(characterId ?? 0, {
        // @ts-expect-error generated code parses this wrong as url param
        labels: labels !== undefined ? labels.join(",") : undefined,
      }),
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
          initialPageParam: undefined,
          queryFn: ({ pageParam }) =>
            getCharactersCharacterIdMail(
              characterId ?? 0,
              {
                last_mail_id: pageParam as number | undefined,
                // @ts-expect-error generated code parses this wrong as url param
                labels: labels !== undefined ? labels.join(",") : undefined,
              },
              {},
              { headers: { ...authHeaders } },
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
    messages: (data?.pages ?? []).flatMap((res) => res.data ?? []),
    hasMoreMessages: hasNextPage,
    loadMoreMessages: fetchNextPage,
    error,
    isLoading,
    mutate: refetch,
  };
}
