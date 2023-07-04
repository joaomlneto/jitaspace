import { memo, useEffect } from "react";
import { Text, type TextProps } from "@mantine/core";
import { useForceUpdate } from "@mantine/hooks";
import { formatDistanceStrict } from "date-fns";

type TimeAgoTextProps = TextProps & {
  date: Date;
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
    const forceUpdate = useForceUpdate();

    useEffect(() => {
      const interval = setInterval(forceUpdate, updateInterval ?? 1000);
      return () => {
        clearInterval(interval);
      };
    }, [forceUpdate, updateInterval]);

    const timeAgo = formatDistanceStrict(date, new Date(), {
      addSuffix,
      unit,
      roundingMethod,
    });

    return <Text {...otherProps}>{timeAgo}</Text>;
  },
);
TimeAgoText.displayName = "TimeAgoText";
