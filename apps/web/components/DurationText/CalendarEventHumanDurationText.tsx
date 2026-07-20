"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useCalendarEvent } from "@jitaspace/hooks";
import { CalendarEventHumanDurationText as UICalendarEventHumanDurationText } from "@jitaspace/ui";

export type CalendarEventHumanDurationTextProps = TextProps & {
  characterId?: number;
  eventId?: number;
};

export const CalendarEventHumanDurationText = memo(
  ({
    characterId,
    eventId,
    ...otherProps
  }: CalendarEventHumanDurationTextProps) => {
    const { data: event } = useCalendarEvent(characterId, eventId);
    const durationMs =
      event?.data.duration === undefined
        ? undefined
        : event.data.duration * 60 * 1000;
    return (
      <UICalendarEventHumanDurationText
        durationMs={durationMs}
        {...otherProps}
      />
    );
  },
);
CalendarEventHumanDurationText.displayName = "CalendarEventHumanDurationText";
