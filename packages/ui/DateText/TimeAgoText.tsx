import { memo, useEffect, useState } from "react";
import { Text, type TextProps } from "@mantine/core";
import { formatDistanceStrict } from "date-fns";

type TimeAgoTextProps = TextProps & {
  date: Date;
  // milliseconds
  updateInterval?: number;
  addSuffix?: boolean;
  unit?: "second" | "minute" | "hour" | "day" | "month" | "year";
  roundingMethod?: "floor" | "ceil" | "round";
};

export const TimeAgoText = memo(
  ({
    updateInterval,
    date,
    addSuffix,
    unit,
    roundingMethod,
    ...otherProps
  }: TimeAgoTextProps) => {
    const [_time, setTime] = useState(Date.now());

    useEffect(() => {
      const interval = setInterval(
        () => setTime(Date.now()),
        updateInterval ?? 1000,
      );
      return () => {
        clearInterval(interval);
      };
    }, []);

    const timeAgo = formatDistanceStrict(date, new Date(), {
      addSuffix,
      unit,
      roundingMethod,
    });

    return <Text {...otherProps}>{timeAgo}</Text>;
  },
);
TimeAgoText.displayName = "TimeAgoText";
