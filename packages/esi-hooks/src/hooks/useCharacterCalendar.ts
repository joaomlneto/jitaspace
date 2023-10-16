import { useGetCharactersCharacterIdCalendarInfinite } from "@jitaspace/esi-client";

import { useEsiClientContext } from "./useEsiClientContext";

export function useCharacterCalendar() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCharactersCharacterIdCalendarInfinite(
      characterId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled:
            characterId !== undefined &&
            isTokenValid &&
            scopes.includes("esi-calendar.read_calendar_events.v1"),
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
    events: (data?.pages ?? []).flatMap((res) => res.data ?? []),
    hasMoreEvents: hasNextPage,
    loadMoreEvents: fetchNextPage,
    error,
    isLoading,
    mutate: refetch,
  };
}
