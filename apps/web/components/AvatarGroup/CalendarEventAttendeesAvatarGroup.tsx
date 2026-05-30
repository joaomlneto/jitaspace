"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";
import { useCalendarEventAttendees } from "@jitaspace/hooks";
import { CalendarEventAttendeesAvatarGroup as UICalendarEventAttendeesAvatarGroup } from "@jitaspace/ui";

export type CalendarEventAttendeesAvatarGroupProps = AvatarProps & {
  characterId?: number;
  eventId?: number;
  limit?: number;
};

export const CalendarEventAttendeesAvatarGroup = memo(
  ({ characterId, eventId, limit, ...otherProps }: CalendarEventAttendeesAvatarGroupProps) => {
    const { data } = useCalendarEventAttendees(characterId, eventId);
    return (
      <UICalendarEventAttendeesAvatarGroup
        attendees={data?.data}
        limit={limit}
        {...otherProps}
      />
    );
  },
);
CalendarEventAttendeesAvatarGroup.displayName = "CalendarEventAttendeesAvatarGroup";
