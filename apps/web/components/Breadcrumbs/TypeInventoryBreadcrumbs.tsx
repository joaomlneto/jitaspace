"use client";

import { memo } from "react";
import { type BreadcrumbsProps } from "@mantine/core";
import { useCategory, useGroup, useType } from "@jitaspace/hooks";
import { TypeInventoryBreadcrumbs as UITypeInventoryBreadcrumbs } from "@jitaspace/ui";

export type TypeInventoryBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  typeId?: string | number;
  showType?: boolean;
};

export const TypeInventoryBreadcrumbs = memo(
  ({ typeId, showType, ...otherProps }: TypeInventoryBreadcrumbsProps) => {
    const typeIdNum = typeof typeId === "string" ? parseInt(typeId) : typeId;
    const { data: type } = useType(typeIdNum ?? 0);
    const groupId = type?.data.group_id;
    const { data: group } = useGroup(groupId ?? 0);
    const categoryId = group?.data.category_id;
    const { data: category } = useCategory(categoryId ?? 0);

    return (
      <UITypeInventoryBreadcrumbs
        typeId={typeId}
        groupId={groupId}
        groupName={group?.data.name}
        categoryId={categoryId}
        categoryName={category?.data.name}
        showType={showType}
        {...otherProps}
      />
    );
  },
);
TypeInventoryBreadcrumbs.displayName = "TypeInventoryBreadcrumbs";
