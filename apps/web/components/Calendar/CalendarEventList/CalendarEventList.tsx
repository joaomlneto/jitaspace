import React from "react";
import { type TableProps } from "@mantine/core";

import { type GetCharactersCharacterIdCalendar200Item } from "@jitaspace/esi-client";

import {
  DesktopCalendarEventList,
  MobileCalendarEventList,
} from "~/components/Calendar";

type CalendarEventListProps = TableProps & {
  events: GetCharactersCharacterIdCalendar200Item[];
};

export function CalendarEventList(props: CalendarEventListProps) {
  return (
    <>
      {/* FIXME MANTINE V7 MIGRATION */}
      <DesktopCalendarEventList {...props} />
      <MobileCalendarEventList {...props} />
    </>
  );
}
