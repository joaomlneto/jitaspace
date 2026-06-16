"use client";

import type { TextProps } from "@mantine/core";
import { memo, useMemo } from "react";
import { Text } from "@mantine/core";
import humanizeDuration from "humanize-duration";

export type HumanDurationTextProps = TextProps & {
  duration: number;
  options?: humanizeDuration.Options;
};

export const HumanDurationText = memo(
  ({ duration, options, ...otherProps }: HumanDurationTextProps) => {
    const durationString = useMemo(
      () => humanizeDuration(duration, options),
      [duration, options],
    );

    return <Text {...otherProps}>{durationString}</Text>;
  },
);
HumanDurationText.displayName = "TimeAgoText";
