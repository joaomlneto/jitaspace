"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { CalendarEventAttendeesAvatarGroup as UICalendarEventAttendeesAvatarGroup } from "@jitaspace/eve-components";
import { useCalendarEventAttendees } from "@jitaspace/hooks";

export type CalendarEventAttendeesAvatarGroupProps = AvatarProps & {
  characterId?: number;
  eventId?: number;
  limit?: number;
};

export const CalendarEventAttendeesAvatarGroup = memo(
  ({
    characterId,
    eventId,
    limit,
    ...otherProps
  }: CalendarEventAttendeesAvatarGroupProps) => {
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
CalendarEventAttendeesAvatarGroup.displayName =
  "CalendarEventAttendeesAvatarGroup";
