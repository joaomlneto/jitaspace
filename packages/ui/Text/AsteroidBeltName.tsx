"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

export type AsteroidBeltNameProps = TextProps & {
  name?: string;
};

export const AsteroidBeltName = memo(
  ({ name, ...otherProps }: AsteroidBeltNameProps) => {
    if (!name) {
      const placeholder = "Unknown asteroid belt";
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
AsteroidBeltName.displayName = "AsteroidBeltName";
