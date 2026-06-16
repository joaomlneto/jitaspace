"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import { memo } from "react";

import { useCategory, useGroup } from "@jitaspace/hooks";
import { GroupBreadcrumbs as UIGroupBreadcrumbs } from "@jitaspace/ui";

export type GroupBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  groupId?: number;
};

export const GroupBreadcrumbs = memo(
  ({ groupId, ...otherProps }: GroupBreadcrumbsProps) => {
    const { data: group } = useGroup(groupId ?? 0);
    const categoryId = group?.data.category_id;
    const { data: category } = useCategory(categoryId ?? 0);

    return (
      <UIGroupBreadcrumbs
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
