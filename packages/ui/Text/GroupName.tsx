"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

export type GroupNameProps = TextProps & {
  name?: string;
};

export const GroupName = memo(({ name, ...otherProps }: GroupNameProps) => {
  if (!name) {
    const placeholder = "Unknown Group";
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
GroupName.displayName = "GroupName";
