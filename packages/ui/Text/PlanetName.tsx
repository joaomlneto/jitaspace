"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

export type PlanetNameProps = TextProps & {
  name?: string;
};

export const PlanetName = memo(({ name, ...otherProps }: PlanetNameProps) => {
  if (!name) {
    const placeholder = "Unknown planet";
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
PlanetName.displayName = "PlanetName";
