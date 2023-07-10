import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { CalendarEventDetailsPanel } from "~/components/Calendar";

export function ViewCalendarEventModal({
  innerProps,
}: ContextModalProps<{ eventId?: number }>) {
  return <CalendarEventDetailsPanel eventId={innerProps.eventId} />;
}
