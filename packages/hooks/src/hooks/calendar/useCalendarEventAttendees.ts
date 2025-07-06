"use client";

import {
  GetCharactersCharacterIdCalendarEventIdAttendees200EventResponseEnum,
  GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponse,
  useGetCharactersCharacterIdCalendarEventIdAttendees,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type CalendarEventAttendee =
  GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponse[number];

export type CalendarEventAttendeeResponse =
  GetCharactersCharacterIdCalendarEventIdAttendees200EventResponseEnum;

export const useCalendarEventAttendees = (
  characterId?: number,
  eventId?: number,
) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-calendar.read_calendar_events.v1"],
  });

  return useGetCharactersCharacterIdCalendarEventIdAttendees(
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
};
