"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import { memo } from "react";

import { useCategory, useGroup, useType } from "@jitaspace/hooks";

import { TypeInventoryBreadcrumbsDisplay } from "./TypeInventoryBreadcrumbsDisplay";

export type TypeInventoryBreadcrumbsProps = Omit<
  BreadcrumbsProps,
  "children"
> & {
  typeId?: string | number;
  showType?: boolean;
};

export const TypeInventoryBreadcrumbs = memo(
  ({ typeId, showType, ...otherProps }: TypeInventoryBreadcrumbsProps) => {
    const typeIdNum =
      typeof typeId === "string" ? Number.parseInt(typeId) : typeId;
    const { data: type } = useType(typeIdNum);
    const groupId = type?.groupID;
    const { data: group } = useGroup(groupId);
    const categoryId = group?.categoryID;
    const { data: category } = useCategory(categoryId);

    return (
      <TypeInventoryBreadcrumbsDisplay
        typeId={typeId}
        groupId={groupId}
        groupName={group?.name}
        categoryId={categoryId}
        categoryName={category?.name}
        showType={showType}
        {...otherProps}
      />
    );
  },
);
TypeInventoryBreadcrumbs.displayName = "TypeInventoryBreadcrumbs";
