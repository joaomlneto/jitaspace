import type { CalendarProps } from "@mantine/dates";
import React from "react";
import { Indicator } from "@mantine/core";
import { Calendar } from "@mantine/dates";

import { CalendarEvent } from "@jitaspace/hooks";

type CharacterMonthCalendarProps = CalendarProps & {
  events: CalendarEvent[];
};

export default function EventsCalendar({
  events,
  ...otherProps
}: CharacterMonthCalendarProps) {
  const eventsPerDate: {
    [date: string]: CalendarEvent[];
  } = {};

  if (events) {
    events.forEach((event) => {
      if (!event.event_date) return;
      const date = new Date(event.event_date);
      date.setHours(0, 0, 0, 0);
      const dateString = date.getTime();
      if (!eventsPerDate[dateString]) {
        eventsPerDate[dateString] = [];
      }
      eventsPerDate[dateString]?.push(event);
    });
  }

  return (
    <Calendar
      excludeDate={(dateString: string) => {
        const date = new Date(dateString);
        // return false if date is before today
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        return date.getTime() < startOfToday;
      }}
      renderDay={(dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const dayEvents = eventsPerDate[date.getTime()] ?? [];
        return (
          <Indicator
            label={dayEvents.length}
            size={16}
            offset={-2}
            disabled={dayEvents.length === 0}
          >
            <div>{day}</div>
          </Indicator>
        );
      }}
      {...otherProps}
    />
  );
}
