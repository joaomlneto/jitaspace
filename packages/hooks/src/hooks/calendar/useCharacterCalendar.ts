"use client";

import {
  getCharactersCharacterIdCalendarInfiniteQueryKey,
  useGetCharactersCharacterIdCalendarInfinite,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { esiInfiniteQueryKey } from "../utils/esiQueryKeys";

/**
 * How many event summaries ESI answers `/characters/{id}/calendar` with. A page
 * that comes back shorter than this is the last one.
 */
const ESI_CALENDAR_PAGE_SIZE = 50;

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
          // The generated default is `0`, which esi-client's own kubb.config.ts
          // flags as invalid — `from_event` is an event id, not an offset, and
          // there is no event 0. Omitting it entirely is what asks for "the
          // next 50 chronological event summaries from now", which is the first
          // page. Same override useCharacterMails applies to `last_mail_id`.
          initialPageParam: undefined as number | undefined,
          getNextPageParam: (lastPage) => {
            if (lastPage.data.length < ESI_CALENDAR_PAGE_SIZE) return undefined;
            // `from_event` pages FORWARD — ESI returns "the next 50
            // chronological event summaries from after that event" — so the
            // cursor is the page's LAST entry, the one furthest along the
            // window we just read. Taking the lowest id (the rule the mail
            // cursor follows, where `last_mail_id` means "older than") walked
            // the window backwards by a single event per request, so each page
            // repeated 49 of the 50 events before it.
            //
            // Position, not `Math.max`: event ids are assigned when an event is
            // created, so a recently-created event with an early date carries a
            // high id. Only the array order is chronological.
            return lastPage.data.at(-1)?.event_id;
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
