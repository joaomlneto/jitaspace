"use client";

import type { AvatarGroupProps, AvatarProps } from "@mantine/core";
import React, { memo } from "react";
import { Avatar, Skeleton, Tooltip } from "@mantine/core";

import { CharacterAvatar } from "../Avatar";
import { CharacterName } from "../Text";

export type CalendarEventAttendee = {
  character_id?: number;
  event_response?: string;
};

export type CalendarEventAttendeesAvatarGroupProps = AvatarProps & {
  attendees?: CalendarEventAttendee[];
  limit?: number;
  spacing?: AvatarGroupProps["spacing"];
};

export const CalendarEventAttendeesAvatarGroup = memo(
  ({
    attendees,
    limit,
    spacing,
    ...otherProps
  }: CalendarEventAttendeesAvatarGroupProps) => {
    if (!attendees) {
      return (
        <Skeleton>
          <Avatar.Group>
            <Avatar {...otherProps} />
          </Avatar.Group>
        </Skeleton>
      );
    }

    const filteredAttendees = attendees.filter(
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
