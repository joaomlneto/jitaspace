"use client";

import type { SelectProps } from "@mantine/core";
import { memo, useCallback } from "react";
import { openConfirmModal } from "@mantine/modals";

import { putCharactersCharacterIdCalendarEventId } from "@jitaspace/esi-client";
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
  ({
    characterId,
    eventId,
    ...otherProps
  }: CalendarEventAttendanceSelectProps) => {
    const {
      data: event,
      isLoading,
      canRespondToEvents,
    } = useCalendarEvent(characterId, eventId);
    const { authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-calendar.respond_calendar_events.v1"],
    });

    const handleRespond = useCallback(
      async (response: CalendarEventAttendanceResponse) => {
        if (!characterId || !eventId) return;
        // ESI accepts accepted/declined/tentative only: `not_responded` is the
        // initial state of an invitation, not an answer you can send back.
        if (response === "not_responded") return;
        await putCharactersCharacterIdCalendarEventId(
          characterId,
          eventId,
          { response },
          authHeaders,
        );
      },
      [characterId, eventId, authHeaders],
    );

    const eventTitle = event?.data.title;
    const confirmResponse = useCallback(
      (response: CalendarEventAttendanceResponse, apply: () => void) => {
        openConfirmModal({
          title: "Are you sure?",
          children: `This will mark event ${eventTitle} as ${response}.`,
          labels: { confirm: "Confirm", cancel: "Cancel" },
          onConfirm: apply,
        });
      },
      [eventTitle],
    );

    return (
      <UICalendarEventAttendanceSelect
        initialResponse={
          event?.data.response as
            | CalendarEventAttendanceResponse
            | null
            | undefined
        }
        canRespond={canRespondToEvents}
        isLoading={isLoading}
        confirmResponse={confirmResponse}
        onRespond={handleRespond}
        {...otherProps}
      />
    );
  },
);
CalendarEventAttendanceSelect.displayName = "CalendarEventAttendanceSelect";
