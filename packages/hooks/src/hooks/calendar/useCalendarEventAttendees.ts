"use client";

import {
  CharactersCharacterIdCalendarEventIdAttendeesGet,
  CharactersCharacterIdCalendarEventIdAttendeesGetEventResponseEnum,
  useGetCharactersCharacterIdCalendarEventIdAttendees,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type CalendarEventAttendee =
  CharactersCharacterIdCalendarEventIdAttendeesGet[number];

export type CalendarEventAttendeeResponse =
  CharactersCharacterIdCalendarEventIdAttendeesGetEventResponseEnum;

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
