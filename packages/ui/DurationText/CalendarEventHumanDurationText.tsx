"use client";

import type { TextProps } from "@mantine/core";
import type humanizeDuration from "humanize-duration";
import { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

import { HumanDurationText } from "./HumanDurationText";

export type CalendarEventHumanDurationTextProps = TextProps & {
  durationMs?: number;
  options?: humanizeDuration.Options;
};

export const CalendarEventHumanDurationText = memo(
  ({
    durationMs,
    options,
    ...otherProps
  }: CalendarEventHumanDurationTextProps) => {
    if (durationMs === undefined) {
      return (
        <Skeleton>
          <Text>Loading...</Text>
        </Skeleton>
      );
    }

    if (durationMs === 0) {
      return <Text {...otherProps}>No duration specified</Text>;
    }

    return (
      <HumanDurationText
        duration={durationMs}
        options={options}
        {...otherProps}
      />
    );
  },
);
CalendarEventHumanDurationText.displayName = "CalendarEventHumanDurationText";
