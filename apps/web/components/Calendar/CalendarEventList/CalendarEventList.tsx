import React from "react";
import { type TableProps } from "@mantine/core";

import { CalendarEvent } from "@jitaspace/hooks";

import {
  DesktopCalendarEventList,
  MobileCalendarEventList,
} from "~/components/Calendar";


type CalendarEventListProps = TableProps & {
  characterId: number;
  events: CalendarEvent[];
};

export function CalendarEventList(props: CalendarEventListProps) {
  return (
    <>
      <DesktopCalendarEventList {...props} />
      <MobileCalendarEventList {...props} />
    </>
  );
}
