"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

export type DogmaEffectNameProps = TextProps & {
  name?: string;
};

export const DogmaEffectName = memo(
  ({ name, ...otherProps }: DogmaEffectNameProps) => {
    if (!name) {
      const placeholder = "Unknown effect";
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
DogmaEffectName.displayName = "DogmaEffectName";
