import React, { memo } from "react";
import {
  Avatar,
  AvatarGroupProps,
  Skeleton,
  Tooltip,
  type AvatarProps,
} from "@mantine/core";

import { useGetCharactersCharacterIdCalendarEventIdAttendees } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";

import { CharacterAvatar } from "../Avatar";
import { CharacterName } from "../Text";


type CalendarEventAttendeesAvatarGroupProps = AvatarProps & {
  characterId: number;
  eventId?: number;
  limit?: number;
  spacing?: AvatarGroupProps["spacing"];
};
export const CalendarEventAttendeesAvatarGroup = memo(
  ({
    characterId,
    eventId,
    limit,
    spacing,
    ...otherProps
  }: CalendarEventAttendeesAvatarGroupProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-calendar.read_calendar_events.v1"],
    });

    const { data: attendees } =
      useGetCharactersCharacterIdCalendarEventIdAttendees(
        characterId ?? 0,
        eventId ?? 0,
        {},
        { ...authHeaders },
        {
          query: {
            enabled: !!eventId && !!characterId && accessToken !== null,
          },
        },
      );

    if (!attendees) {
      return (
        <Skeleton>
          <Avatar.Group>
            <Avatar {...otherProps} />
          </Avatar.Group>
        </Skeleton>
      );
    }

    const filteredAttendees = (attendees?.data ?? []).filter(
      (attendee) => attendee.event_response === "accepted",
    );

    const tooManyAttendees = limit && filteredAttendees.length > limit;

    return (
      <Tooltip.Group>
        <Avatar.Group spacing={spacing}>
          {filteredAttendees
            .slice(0, tooManyAttendees ? limit - 1 : undefined)
            .map((attendee) => (
              <Tooltip
                key={attendee.character_id}
                withArrow
                label={<CharacterName characterId={attendee.character_id} />}
              >
                <Avatar {...otherProps}>
                  <CharacterAvatar
                    characterId={attendee.character_id}
                    {...otherProps}
                  />
                </Avatar>
              </Tooltip>
            ))}
          {limit && filteredAttendees.length > limit && (
            <Avatar {...otherProps}>
              +{filteredAttendees.length - limit + 1}
            </Avatar>
          )}
        </Avatar.Group>
      </Tooltip.Group>
    );
  },
);
CalendarEventAttendeesAvatarGroup.displayName =
  "CalendarEventAttendeesAvatarGroup";
