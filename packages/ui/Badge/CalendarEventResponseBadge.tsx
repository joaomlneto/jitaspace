import React, { memo } from "react";
import { Badge, Skeleton, type BadgeProps } from "@mantine/core";

import {
  useGetCharactersCharacterIdCalendarEventId,
  type GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponseEventResponse,
} from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/hooks";

export type CalendarEventResponseBadgeProps = BadgeProps & {
  eventId?: number;
};

const eventResponseColor: {
  [key in GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponseEventResponse]: string;
} = {
  accepted: "green",
  tentative: "yellow",
  not_responded: "gray",
  declined: "red",
};

export const CalendarEventResponseBadge = memo(
  ({ eventId, ...otherProps }: CalendarEventResponseBadgeProps) => {
    const { characterId, isTokenValid, scopes, accessToken } =
      useEsiClientContext();

    const { data: event, isLoading } =
      useGetCharactersCharacterIdCalendarEventId(
        characterId ?? 0,
        eventId ?? 0,
        { token: accessToken },
        {},
        {
          query: {
            enabled:
              isTokenValid &&
              !!eventId &&
              scopes.includes("esi-calendar.read_calendar_events.v1"),
          },
        },
      );

    const response = event?.data.response as
      | GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponseEventResponse
      | undefined;

    if (!response || isLoading) {
      return (
        <Skeleton>
          <Badge variant="light" {...otherProps}>
            Something
          </Badge>
        </Skeleton>
      );
    }

    return (
      <Badge color={eventResponseColor[response]} {...otherProps}>
        {response.replace("_", " ")}
      </Badge>
    );
  },
);
CalendarEventResponseBadge.displayName = "CalendarEventResponseBadge";
