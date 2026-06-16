"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useGroup } from "@jitaspace/hooks";
import { GroupName as UIGroupName } from "@jitaspace/ui";

export type GroupNameProps = TextProps & {
  groupId?: number;
};

export const GroupName = memo(({ groupId, ...otherProps }: GroupNameProps) => {
  const { data } = useGroup(groupId ?? 0);
  return <UIGroupName name={data?.data.name} {...otherProps} />;
});
GroupName.displayName = "GroupName";
