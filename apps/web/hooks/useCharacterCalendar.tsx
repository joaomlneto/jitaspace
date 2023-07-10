import useSWRInfinite from "swr/infinite";

import {
  getGetCharactersCharacterIdCalendarKey,
  useEsiClientContext,
  type GetCharactersCharacterIdCalendar200Item,
  type GetCharactersCharacterIdCalendarParams,
} from "@jitaspace/esi-client";

import { ESI_BASE_URL } from "~/config/constants";

export function useCharacterCalendar() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCharactersCharacterIdCalendar200Item[], Error>(
      function getKey(
        pageIndex,
        previousPageData: GetCharactersCharacterIdCalendar200Item[],
      ) {
        if (
          !characterId ||
          !isTokenValid ||
          !scopes.includes("esi-calendar.read_calendar_events.v1")
        ) {
          throw new Error("Insufficient permissions to read calendar events");
        }

        return () => {
          const [endpointUrl] =
            getGetCharactersCharacterIdCalendarKey(characterId);
          const params: GetCharactersCharacterIdCalendarParams = {
            ...(pageIndex > 0
              ? {
                  from_event:
                    pageIndex > 0
                      ? (previousPageData ?? [])
                          .slice(0, 50 * pageIndex)
                          .reduce(
                            (acc, event) =>
                              Math.min(acc, event.event_id ?? acc),
                            Infinity,
                          )
                      : undefined,
                }
              : {}),
          };
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) =>
            searchParams.append(key, value.toString()),
          );
          return `${ESI_BASE_URL}${endpointUrl}?${searchParams.toString()}`;
        };
      },
      (url: string) =>
        fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((r) => r.json()),
      { refreshInterval: 30000, revalidateAll: true },
    );

  const events = data?.flat() ?? [];
  const hasMoreEvents = events.length === 50 * size;

  const loadMoreEvents = () => {
    void setSize(size + 1);
  };

  return {
    events,
    hasMoreEvents,
    loadMoreEvents,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
