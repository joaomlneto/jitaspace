"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import { memo } from "react";
import { Anchor, Breadcrumbs, Text } from "@mantine/core";

import { TypeName } from "@jitaspace/eve-components";
import { CategoryName, GroupName } from "@jitaspace/ui";

import { CategoryAnchor, GroupAnchor, TypeAnchor } from "~/components/Anchor";
import { HoverPrefetchLink } from "~/components/Link";

export type TypeInventoryBreadcrumbsDisplayProps = Omit<
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

export const TypeInventoryBreadcrumbsDisplay = memo(
  ({
    typeId,
    groupId,
    groupName,
    categoryId,
    categoryName,
    showType = false,
    ...otherProps
  }: TypeInventoryBreadcrumbsDisplayProps) => {
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
        {showType && (
          <TypeAnchor typeId={typeId}>
            <TypeName typeId={typeId} />
          </TypeAnchor>
        )}
      </Breadcrumbs>
    );
  },
);
TypeInventoryBreadcrumbsDisplay.displayName = "TypeInventoryBreadcrumbsDisplay";
