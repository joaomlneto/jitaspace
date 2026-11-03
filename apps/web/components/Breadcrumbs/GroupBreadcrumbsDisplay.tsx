"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import { memo } from "react";
import { Anchor, Breadcrumbs, Text } from "@mantine/core";

import { CategoryName, GroupName } from "@jitaspace/ui";

import { CategoryAnchor, GroupAnchor } from "~/components/Anchor";
import { HoverPrefetchLink } from "~/components/Link";

export type GroupBreadcrumbsDisplayProps = Omit<
  BreadcrumbsProps,
  "children"
> & {
  groupId?: number;
  groupName?: string;
  categoryId?: number;
  categoryName?: string;
};

export const GroupBreadcrumbsDisplay = memo(
  ({
    groupId,
    groupName,
    categoryId,
    categoryName,
    ...otherProps
  }: GroupBreadcrumbsDisplayProps) => {
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
GroupBreadcrumbsDisplay.displayName = "GroupBreadcrumbsDisplay";
