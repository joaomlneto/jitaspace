"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import React, { memo } from "react";
import Link from "next/link";
import { Anchor, Breadcrumbs, Text } from "@mantine/core";

import { CategoryAnchor, GroupAnchor, TypeAnchor } from "../Anchor";
import { CategoryName, GroupName, TypeName } from "../Text";

export type TypeInventoryBreadcrumbsProps = Omit<
  BreadcrumbsProps,
  "children"
> & {
  typeId?: string | number;
  groupId?: number;
  groupName?: string;
  categoryId?: number;
  categoryName?: string;
  showType?: boolean;
};

export const TypeInventoryBreadcrumbs = memo(
  ({
    typeId,
    groupId,
    groupName,
    categoryId,
    categoryName,
    showType = false,
    ...otherProps
  }: TypeInventoryBreadcrumbsProps) => {
    return (
      <Breadcrumbs {...otherProps}>
        <Anchor component={Link} href="/categories">
          <Text>Inventory</Text>
        </Anchor>
        <CategoryAnchor categoryId={categoryId}>
          <CategoryName name={categoryName} />
        </CategoryAnchor>
        <GroupAnchor groupId={groupId}>
          <GroupName name={groupName} />
        </GroupAnchor>
        {showType && (
          <TypeAnchor typeId={typeId}>
            <TypeName typeId={typeId} />
          </TypeAnchor>
        )}
      </Breadcrumbs>
    );
  },
);
TypeInventoryBreadcrumbs.displayName = "TypeInventoryBreadcrumbs";
