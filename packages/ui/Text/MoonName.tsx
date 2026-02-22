"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseMoonsMoonId } from "@jitaspace/esi-client";





export type MoonNameProps = TextProps & {
  moonId?: number;
};

export const MoonName = memo(({ moonId, ...otherProps }: MoonNameProps) => {
  const { data, isLoading } = useGetUniverseMoonsMoonId(
    moonId ?? 1,
    {},
    {},
    { query: { enabled: !!moonId } },
  );
  if (isLoading) {
    const placeholder = "Unknown moon";
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
  return <Text {...otherProps}>{data?.data.name}</Text>;
});
MoonName.displayName = "MoonName";
