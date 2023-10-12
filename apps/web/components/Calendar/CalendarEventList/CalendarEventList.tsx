import React from "react";
import { MediaQuery, type TableProps } from "@mantine/core";

import { type GetCharactersCharacterIdCalendarQueryResponse } from "@jitaspace/esi-client-kubb";

import {
  DesktopCalendarEventList,
  MobileCalendarEventList,
} from "~/components/Calendar";


type CalendarEventListProps = TableProps & {
  events: GetCharactersCharacterIdCalendarQueryResponse;
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
