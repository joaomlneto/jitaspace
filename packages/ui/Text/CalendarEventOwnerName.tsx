import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetCharactersCharacterIdCalendarEventId } from "@jitaspace/esi-client-kubb";
import { useEsiClientContext } from "@jitaspace/esi-hooks";





export type CalendarEventOwnerNameProps = TextProps & {
  eventId?: number;
};
export const CalendarEventOwnerName = memo(
  ({ eventId, ...otherProps }: CalendarEventOwnerNameProps) => {
    const { characterId, isTokenValid } = useEsiClientContext();

    const { data: event, isLoading } =
      useGetCharactersCharacterIdCalendarEventId(
        characterId ?? 0,
        eventId ?? 0,
        {},
        {},
        {
          query: {
            enabled: isTokenValid && !!eventId,
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
