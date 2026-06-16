"use client";

import type { AnchorProps } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { memo } from "react";

import { CalendarEventOwnerAnchor as UICalendarEventOwnerAnchor } from "@jitaspace/eve-components";
import { useCalendarEvent } from "@jitaspace/hooks";

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
