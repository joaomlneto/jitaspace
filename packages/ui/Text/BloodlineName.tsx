"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseBloodlines } from "@jitaspace/esi-client";





export type BloodlineNameProps = TextProps & {
  bloodlineId?: string | number;
};

export const BloodlineName = memo(
  ({ bloodlineId, ...otherProps }: BloodlineNameProps) => {
    const { data, isLoading } = useGetUniverseBloodlines();

    const bloodline = data?.data.find((r) => r.bloodline_id == bloodlineId);

    if (!bloodline || isLoading) {
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
    return <Text {...otherProps}>{bloodline.name}</Text>;
  },
);
BloodlineName.displayName = "BloodlineName";
