"use client";

import { memo, useCallback } from "react";
import { type SelectProps } from "@mantine/core";
import {
  putCharactersCharacterIdCalendarEventId,
} from "@jitaspace/esi-client";
import { useAccessToken, useCalendarEvent } from "@jitaspace/hooks";
import { CalendarEventAttendanceSelect as UICalendarEventAttendanceSelect } from "@jitaspace/ui";

type CalendarEventAttendanceResponse =
  | "accepted"
  | "declined"
  | "tentative"
  | "not_responded";

export type CalendarEventAttendanceSelectProps = Omit<SelectProps, "data"> & {
  characterId?: number;
  eventId?: number;
};

export const CalendarEventAttendanceSelect = memo(
  ({ characterId, eventId, ...otherProps }: CalendarEventAttendanceSelectProps) => {
    const { data: event, isLoading, canRespondToEvents } = useCalendarEvent(
      characterId,
      eventId,
    );
    const { authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-calendar.respond_calendar_events.v1"],
    });

    const handleRespond = useCallback(
      async (response: CalendarEventAttendanceResponse) => {
        if (!characterId || !eventId) return;
        await putCharactersCharacterIdCalendarEventId(
          characterId,
          eventId,
          { response },
          authHeaders,
        );
      },
      [characterId, eventId, authHeaders],
    );

    return (
      <UICalendarEventAttendanceSelect
        eventTitle={event?.data.title}
        initialResponse={
          event?.data.response as CalendarEventAttendanceResponse | null | undefined
        }
        canRespond={canRespondToEvents}
        isLoading={isLoading}
        onRespond={handleRespond}
        {...otherProps}
      />
    );
  },
);
CalendarEventAttendanceSelect.displayName = "CalendarEventAttendanceSelect";
