"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import { memo } from "react";

import { useCategory, useGroup } from "@jitaspace/hooks";

import { GroupBreadcrumbsDisplay } from "./GroupBreadcrumbsDisplay";

export type GroupBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  groupId?: number;
};

export const GroupBreadcrumbs = memo(
  ({ groupId, ...otherProps }: GroupBreadcrumbsProps) => {
    const { data: group } = useGroup(groupId);
    const categoryId = group?.data.category_id;
    const { data: category } = useCategory(categoryId);

    return (
      <GroupBreadcrumbsDisplay
        groupId={groupId}
        groupName={group?.data.name}
        categoryId={categoryId}
        categoryName={category?.data.name}
        {...otherProps}
      />
    );
  },
);
GroupBreadcrumbs.displayName = "GroupBreadcrumbs";
