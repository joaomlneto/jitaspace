"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

export type RaceNameProps = TextProps & {
  name?: string;
};

export const RaceName = memo(({ name, ...otherProps }: RaceNameProps) => {
  if (!name) {
    const placeholder = "Unknown race";
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
  return <Text {...otherProps}>{name}</Text>;
});
RaceName.displayName = "RaceName";
