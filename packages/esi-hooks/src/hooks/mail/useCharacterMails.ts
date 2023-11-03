import { useMemo } from "react";
import { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import {
  getCharactersCharacterIdMail,
  getCharactersCharacterIdMailQueryKey,
  useGetCharactersCharacterIdMailInfinite,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";


type useCharacterMailsProps = {
  labels?: number[];
};

export function useCharacterMails({ labels = [] }: useCharacterMailsProps) {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const queryKey = useMemo(
    () =>
      getCharactersCharacterIdMailQueryKey(characterId ?? 0, {
        token: accessToken,
        // @ts-expect-error generated code parses this wrong as url param
        labels: labels !== undefined ? labels.join(",") : undefined,
      }),
    [characterId, labels, accessToken],
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCharactersCharacterIdMailInfinite(
      characterId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled:
            characterId !== undefined &&
            isTokenValid &&
            scopes.includes("esi-mail.read_mail.v1"),
          queryKey,
          queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, any>) =>
            getCharactersCharacterIdMail(characterId ?? 0, {
              last_mail_id: pageParam,
              // @ts-expect-error generated code parses this wrong as url param
              labels: labels !== undefined ? labels.join(",") : undefined,
              token: accessToken,
            }),
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
