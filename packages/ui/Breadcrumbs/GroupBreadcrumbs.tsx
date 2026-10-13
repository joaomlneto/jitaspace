"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import { memo } from "react";
import { Anchor, Breadcrumbs, Text } from "@mantine/core";

import { CategoryAnchor, GroupAnchor } from "../Anchor";
import { HoverPrefetchLink } from "../Link";
import { CategoryName, GroupName } from "../Text";

export type GroupBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  groupId?: number;
  groupName?: string;
  categoryId?: number;
  categoryName?: string;
};

export const GroupBreadcrumbs = memo(
  ({
    groupId,
    groupName,
    categoryId,
    categoryName,
    ...otherProps
  }: GroupBreadcrumbsProps) => {
    return (
      <Breadcrumbs {...otherProps}>
        <Anchor component={HoverPrefetchLink} href="/categories">
          <Text>Inventory</Text>
        </Anchor>
        <CategoryAnchor categoryId={categoryId}>
          <CategoryName name={categoryName} />
        </CategoryAnchor>
        <GroupAnchor groupId={groupId}>
          <GroupName name={groupName} />
        </GroupAnchor>
      </Breadcrumbs>
    );
  },
);
GroupBreadcrumbs.displayName = "GroupBreadcrumbs";
