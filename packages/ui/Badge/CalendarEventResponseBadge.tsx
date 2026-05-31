"use client";

import type { BadgeProps } from "@mantine/core";
import React, { memo } from "react";
import { Badge, Skeleton } from "@mantine/core";

export type CalendarEventResponse =
  | "accepted"
  | "tentative"
  | "not_responded"
  | "declined";

export type CalendarEventResponseBadgeProps = BadgeProps & {
  response?: CalendarEventResponse;
};

const eventResponseColor: { [key in CalendarEventResponse]: string } = {
  accepted: "green",
  tentative: "yellow",
  not_responded: "gray",
  declined: "red",
};

export const CalendarEventResponseBadge = memo(
  ({ response, ...otherProps }: CalendarEventResponseBadgeProps) => {
    if (!response) {
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
