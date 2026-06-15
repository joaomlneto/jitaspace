"use client";

import type { PropsWithChildren } from "react";
import React, { memo } from "react";
import { type AnchorProps } from "@mantine/core";
import { useCalendarEvent } from "@jitaspace/hooks";
import { CalendarEventOwnerAnchor as UICalendarEventOwnerAnchor } from "@jitaspace/ui";

export type CalendarEventOwnerAnchorProps = PropsWithChildren<
  AnchorProps & {
    characterId?: number;
    eventId?: number;
  }
>;

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
