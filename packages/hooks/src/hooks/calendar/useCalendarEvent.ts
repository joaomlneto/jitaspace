import {
  GetCharactersCharacterIdCalendarQueryResponse,
  useGetCharactersCharacterIdCalendarEventId,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";

export type CalendarEvent =
  GetCharactersCharacterIdCalendarQueryResponse[number];

export const useCalendarEvent = (eventId: number) => {
  const { characterId, isTokenValid, scopes, accessToken } =
    useEsiClientContext();

  const eventData = useGetCharactersCharacterIdCalendarEventId(
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

  const canRespondToEvents = scopes.includes(
    "esi-calendar.respond_calendar_events.v1",
  );

  return { ...eventData, canRespondToEvents };
};
