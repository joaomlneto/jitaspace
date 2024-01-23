"use client";

import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { CalendarEventDetailsPanel } from "~/components/Calendar";


export function ViewCalendarEventModal({
  innerProps,
}: ContextModalProps<{ characterId: number; eventId: number }>) {
  return (
    <CalendarEventDetailsPanel
      characterId={innerProps.characterId}
      eventId={innerProps.eventId}
    />
  );
}
