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
  if (isLoading)
    return (
      <Skeleton>
        <Text {...otherProps}>Unknown Group</Text>
      </Skeleton>
    );
  return <Text {...otherProps}>{data?.data.name}</Text>;
});
GroupName.displayName = "GroupName";
