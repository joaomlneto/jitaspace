import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { CalendarEventPanel } from "~/components/Calendar";

export function ViewCalendarEventModal({
  innerProps,
}: ContextModalProps<{ eventId?: number }>) {
  return <CalendarEventPanel eventId={innerProps.eventId} />;
}
