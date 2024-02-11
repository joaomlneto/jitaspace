"use client";

import {
  GetCharactersCharacterIdCalendarQueryResponse,
  useGetCharactersCharacterIdCalendarEventId,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type CalendarEvent =
  GetCharactersCharacterIdCalendarQueryResponse[number];

export const useCalendarEvent = (characterId?: number, eventId?: number) => {
  const { accessToken, authHeaders, character } = useAccessToken({
    characterId,
    scopes: ["esi-calendar.read_calendar_events.v1"],
  });

  const eventData = useGetCharactersCharacterIdCalendarEventId(
    characterId ?? 0,
    eventId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        enabled:
          characterId !== undefined &&
          eventId !== undefined &&
          accessToken !== null,
      },
    },
  );

  const canRespondToEvents = character?.accessTokenPayload.scp.includes(
    "esi-calendar.respond_calendar_events.v1",
  );

  return { ...eventData, canRespondToEvents };
};
