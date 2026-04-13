"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

import { useAncestry } from "@jitaspace/hooks";

export type AncestryNameProps = TextProps & {
  ancestryId?: number;
};

export const AncestryName = memo(
  ({ ancestryId, ...otherProps }: AncestryNameProps) => {
    const { data, isLoading } = useAncestry(ancestryId ?? 0);

    if (isLoading || !data) {
      const placeholder = "Unknown ancestry";
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
    return <Text {...otherProps}>{data.data.name}</Text>;
  },
);
AncestryName.displayName = "AncestryName";
