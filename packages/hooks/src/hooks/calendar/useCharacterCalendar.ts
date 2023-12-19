import { useGetCharactersCharacterIdCalendarInfinite } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


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
    events: (data?.pages ?? []).flatMap((res) => res.data ?? []),
    hasMoreEvents: hasNextPage,
    loadMoreEvents: fetchNextPage,
    error,
    isLoading,
    mutate: refetch,
  };
};
