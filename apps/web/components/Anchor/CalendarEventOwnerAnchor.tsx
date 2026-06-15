"use client";

import React, { memo } from "react";
import { type AnchorProps } from "@mantine/core";

import { CalendarEventOwnerAnchor as UICalendarEventOwnerAnchor } from "@jitaspace/eve-components";
import { useCalendarEvent } from "@jitaspace/hooks";

export type CalendarEventOwnerAnchorProps = AnchorProps & {
  characterId?: number;
  eventId?: number;
};

export const CalendarEventOwnerAnchor = memo(
  ({ characterId, eventId, ...otherProps }: CalendarEventOwnerAnchorProps) => {
    const { data: event } = useCalendarEvent(characterId, eventId);
    return (
      <UICalendarEventOwnerAnchor
        ownerId={event?.data.owner_id}
        ownerType={event?.data.owner_type}
        {...otherProps}
      />
    );
  },
);
CalendarEventOwnerAnchor.displayName = "CalendarEventOwnerAnchor";
