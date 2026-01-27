import type { TableProps } from "@mantine/core";

import type { CalendarEvent } from "@jitaspace/hooks";

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
      <DesktopCalendarEventList {...props} visibleFrom="md" />
      <MobileCalendarEventList {...props} hiddenFrom="md" />
    </>
  );
}
