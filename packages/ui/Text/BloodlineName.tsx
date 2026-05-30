"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

export type BloodlineNameProps = TextProps & {
  name?: string;
};

export const BloodlineName = memo(
  ({ name, ...otherProps }: BloodlineNameProps) => {
    if (!name) {
      const placeholder = "Unknown bloodline";
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
  },
);
BloodlineName.displayName = "BloodlineName";
