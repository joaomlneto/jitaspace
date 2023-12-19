import { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";
import type humanizeDuration from "humanize-duration";

import { useGetCharactersCharacterIdCalendarEventId } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";

import { HumanDurationText } from "./HumanDurationText";


export type CalendarEventHumanDurationTextProps = TextProps & {
  characterId: number;
  eventId?: number;
  options?: humanizeDuration.Options;
};
export const CalendarEventHumanDurationText = memo(
  ({
    characterId,
    eventId,
    options,
    ...otherProps
  }: CalendarEventHumanDurationTextProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-calendar.read_calendar_events.v1"],
    });
    const {
      data: event,
      isLoading,
      error,
    } = useGetCharactersCharacterIdCalendarEventId(
      characterId ?? 1,
      eventId ?? 1,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: !!eventId && accessToken !== null,
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
