"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

import { useGetCharactersCharacterIdCalendarEventId } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";

export type CalendarEventOwnerNameProps = TextProps & {
  characterId: number;
  eventId?: number;
};
export const CalendarEventOwnerName = memo(
  ({ characterId, eventId, ...otherProps }: CalendarEventOwnerNameProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-calendar.read_calendar_events.v1"],
    });

    const { data: event, isLoading } =
      useGetCharactersCharacterIdCalendarEventId(
        characterId ?? 0,
        eventId ?? 0,
        {},
        { ...authHeaders },
        {
          query: {
            enabled: accessToken !== null && !!eventId,
          },
        },
      );

    if (isLoading) {
      const placeholder = "Unknown";
      const skeletonWidth = Math.min(Math.max(placeholder.length, 4), 24);
      return (
        <Text {...otherProps}>
          <Skeleton
            component="span"
            style={{ display: "inline-block" }}
            height="1em"
            width={`${skeletonWidth}ch`}
          />
        </Text>
      );
    }

    return <Text {...otherProps}>{event?.data?.owner_name ?? "Unknown"}</Text>;
  },
);
CalendarEventOwnerName.displayName = "CalendarEventOwnerName";
