"use client";

import {
  getCharactersCharacterIdCalendarInfiniteQueryKey,
  useGetCharactersCharacterIdCalendarInfinite,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { esiInfiniteQueryKey } from "../utils/esiInfiniteQueryKey";

export const useCharacterCalendar = (characterId?: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-calendar.read_calendar_events.v1"],
  });

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCharactersCharacterIdCalendarInfinite(
      characterId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          // Keep this entry distinct from the single-page query for the
          // same endpoint; see esiInfiniteQueryKey.
          queryKey: esiInfiniteQueryKey(
            getCharactersCharacterIdCalendarInfiniteQueryKey(characterId ?? 0),
          ),
          enabled: characterId !== undefined && accessToken !== null,
          getNextPageParam: (lastPage) => {
            if (lastPage.data.length != 50) return undefined;
            return lastPage.data.reduce(
              (acc, msg) => Math.min(acc, msg.event_id ?? acc),
              Infinity,
            );
          },
        },
      },
    );

  return {
    events: (data?.pages ?? []).flatMap((res) => res.data),
    hasMoreEvents: hasNextPage,
    loadMoreEvents: fetchNextPage,
    error,
    isLoading,
    mutate: refetch,
  };
};
