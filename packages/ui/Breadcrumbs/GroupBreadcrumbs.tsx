"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import React, { memo } from "react";
import Link from "next/link";
import { Anchor, Breadcrumbs, Text } from "@mantine/core";

import { useGetUniverseGroupsGroupId } from "@jitaspace/esi-client";

import { CategoryAnchor, GroupAnchor } from "../Anchor";
import { CategoryName, GroupName } from "../Text";

export type GroupBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  groupId?: number;
};

export const GroupBreadcrumbs = memo(
  ({ groupId, ...otherProps }: GroupBreadcrumbsProps) => {
    const { data: group } = useGetUniverseGroupsGroupId(
      groupId ?? 0,
      {},
      {
        query: { enabled: groupId !== undefined },
      },
    );
    return (
      <Breadcrumbs {...otherProps}>
        <Anchor component={Link} href="/categories">
          <Text>Inventory</Text>
        </Anchor>
        <CategoryAnchor categoryId={group?.data.category_id}>
          <CategoryName categoryId={group?.data.category_id} />
        </CategoryAnchor>
        <GroupAnchor groupId={groupId}>
          <GroupName groupId={groupId} />
        </GroupAnchor>
      </Breadcrumbs>
    );
  },
);
GroupBreadcrumbs.displayName = "GroupBreadcrumbs";
