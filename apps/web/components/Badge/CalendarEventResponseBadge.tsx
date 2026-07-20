"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";

import type { CalendarEventResponse } from "@jitaspace/ui";
import { useCalendarEvent } from "@jitaspace/hooks";
import { CalendarEventResponseBadge as UICalendarEventResponseBadge } from "@jitaspace/ui";

export type CalendarEventResponseBadgeProps = BadgeProps & {
  characterId?: number;
  eventId?: number;
  /**
   * The response value, when the caller already has it (e.g. from the calendar
   * summary feed, which includes `event_response`). When provided, the per-event
   * detail request is skipped entirely.
   */
  response?: CalendarEventResponse;
};

export const CalendarEventResponseBadge = memo(
  ({
    characterId,
    eventId,
    response,
    ...otherProps
  }: CalendarEventResponseBadgeProps) => {
    // Only fetch the event detail when the response wasn't supplied directly —
    // passing an undefined eventId keeps the underlying query disabled.
    const { data: event } = useCalendarEvent(
      characterId,
      response === undefined ? eventId : undefined,
    );
    return (
      <UICalendarEventResponseBadge
        response={
          response ??
          (event?.data.response as CalendarEventResponse | undefined)
        }
        {...otherProps}
      />
    );
  },
);
CalendarEventResponseBadge.displayName = "CalendarEventResponseBadge";
