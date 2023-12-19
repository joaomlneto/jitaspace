import React from "react";
import { MediaQuery, type TableProps } from "@mantine/core";

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
      <MediaQuery smallerThan="sm" styles={{ display: "none" }}>
        <DesktopCalendarEventList {...props} />
      </MediaQuery>
      <MediaQuery largerThan="sm" styles={{ display: "none" }}>
        <MobileCalendarEventList {...props} />
      </MediaQuery>
    </>
  );
}
