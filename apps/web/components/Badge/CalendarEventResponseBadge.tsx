"use client";

import { memo } from "react";
import { type BadgeProps } from "@mantine/core";
import { useCalendarEvent } from "@jitaspace/hooks";
import { CalendarEventResponseBadge as UICalendarEventResponseBadge } from "@jitaspace/ui";

export type CalendarEventResponseBadgeProps = BadgeProps & {
  characterId?: number;
  eventId?: number;
};

export const CalendarEventResponseBadge = memo(
  ({ characterId, eventId, ...otherProps }: CalendarEventResponseBadgeProps) => {
    const { data: event } = useCalendarEvent(characterId, eventId);
    return (
      <UICalendarEventResponseBadge
        response={
          event?.data.response as
            | "accepted"
            | "tentative"
            | "not_responded"
            | "declined"
            | undefined
        }
        {...otherProps}
      />
    );
  },
);
CalendarEventResponseBadge.displayName = "CalendarEventResponseBadge";
