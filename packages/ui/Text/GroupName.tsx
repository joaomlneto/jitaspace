"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseGroupsGroupId } from "@jitaspace/esi-client";





export type GroupNameProps = TextProps & {
  groupId?: number;
};

export const GroupName = memo(({ groupId, ...otherProps }: GroupNameProps) => {
  const { data, isLoading } = useGetUniverseGroupsGroupId(
    groupId ?? 1,
    {},
    {},
    { query: { enabled: !!groupId } },
  );
  if (isLoading) {
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
  return <Text {...otherProps}>{data?.data.name}</Text>;
});
GroupName.displayName = "GroupName";
