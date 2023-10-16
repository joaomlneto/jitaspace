import { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";
import type humanizeDuration from "humanize-duration";

import { useGetCharactersCharacterIdCalendarEventId } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

import { HumanDurationText } from "./HumanDurationText";

export type CalendarEventHumanDurationTextProps = TextProps & {
  eventId?: number;
  options?: humanizeDuration.Options;
};
export const CalendarEventHumanDurationText = memo(
  ({
    eventId,
    options,
    ...otherProps
  }: CalendarEventHumanDurationTextProps) => {
    const { characterId, scopes, isTokenValid } = useEsiClientContext();
    const {
      data: event,
      isLoading,
      error,
    } = useGetCharactersCharacterIdCalendarEventId(
      characterId ?? 1,
      eventId ?? 1,
      {},
      {},
      {
        query: {
          enabled:
            !!characterId &&
            !!eventId &&
            isTokenValid &&
            scopes.includes("esi-calendar.read_calendar_events.v1"),
        },
      },
    );

    if (isLoading || error) {
      return (
        <Skeleton>
          <Text>Loading...</Text>
        </Skeleton>
      );
    }

    if (!event?.data.duration) {
      return <Text>No duration specified</Text>;
    }

    return (
      <HumanDurationText
        duration={event.data.duration * 60000}
        options={options}
        {...otherProps}
      />
    );
  },
);
CalendarEventHumanDurationText.displayName = "CalendarEventHumanDurationText";
