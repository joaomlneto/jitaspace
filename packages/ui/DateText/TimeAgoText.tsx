import { memo, useEffect, useState } from "react";
import { Text, type TextProps } from "@mantine/core";
import { formatDistanceStrict } from "date-fns";

type TimeAgoTextProps = TextProps & {
  date: Date;
  // milliseconds
  updateInterval?: number;
};

export const TimeAgoText = memo(
  ({ updateInterval, date, ...otherProps }: TimeAgoTextProps) => {
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

    const timeAgo = formatDistanceStrict(date, new Date());

    console.log("rerendering!");

    return <Text {...otherProps}>{timeAgo}</Text>;
  },
);
TimeAgoText.displayName = "TimeAgoText";
