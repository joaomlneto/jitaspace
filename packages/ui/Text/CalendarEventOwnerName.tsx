"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

export type CalendarEventOwnerNameProps = TextProps & {
  ownerName?: string;
};

export const CalendarEventOwnerName = memo(
  ({ ownerName, ...otherProps }: CalendarEventOwnerNameProps) => {
    if (!ownerName) {
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

    return <Text {...otherProps}>{ownerName}</Text>;
  },
);
CalendarEventOwnerName.displayName = "CalendarEventOwnerName";
