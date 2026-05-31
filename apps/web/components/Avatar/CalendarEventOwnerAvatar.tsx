"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";
import { useCalendarEvent } from "@jitaspace/hooks";
import { CalendarEventOwnerAvatar as UICalendarEventOwnerAvatar } from "@jitaspace/ui";

export type CalendarEventOwnerAvatarProps = Omit<AvatarProps, "src"> & {
  characterId?: number;
  eventId?: number;
};

export const CalendarEventOwnerAvatar = memo(
  ({ characterId, eventId, ...otherProps }: CalendarEventOwnerAvatarProps) => {
    const { data: event } = useCalendarEvent(characterId, eventId);
    return (
      <UICalendarEventOwnerAvatar
        ownerId={event?.data.owner_id}
        ownerType={event?.data.owner_type}
        {...otherProps}
      />
    );
  },
);
CalendarEventOwnerAvatar.displayName = "CalendarEventOwnerAvatar";
