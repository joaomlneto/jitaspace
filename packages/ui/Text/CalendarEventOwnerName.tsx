import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdCalendarEventId,
} from "@jitaspace/esi-client";

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
        undefined,
        {
          swr: {
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
