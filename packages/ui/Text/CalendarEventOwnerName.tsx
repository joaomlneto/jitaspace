"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

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

    if (isLoading || !event?.data) {
      return (
        <Skeleton visible={isLoading}>
          <Text {...otherProps}>Unknown</Text>
        </Skeleton>
      );
    }

    return <Text {...otherProps}>{event.data.owner_name}</Text>;
  },
);
CalendarEventOwnerName.displayName = "CalendarEventOwnerName";
