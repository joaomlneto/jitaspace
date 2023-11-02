import {
  GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponse,
  GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponseEventResponse,
  useGetCharactersCharacterIdCalendarEventIdAttendees,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";

export type CalendarEventAttendee =
  GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponse[number];

export type CalendarEventAttendeeResponse =
  GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponseEventResponse;

export const useCalendarEventAttendees = (eventId: number) => {
  const { characterId, isTokenValid, scopes, accessToken } =
    useEsiClientContext();

  return useGetCharactersCharacterIdCalendarEventIdAttendees(
    characterId ?? 1,
    eventId,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          eventId !== undefined &&
          scopes.includes("esi-calendar.read_calendar_events.v1"),
      },
    },
  );
};
