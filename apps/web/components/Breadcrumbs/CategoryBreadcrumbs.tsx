"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import { memo } from "react";
import { Anchor, Breadcrumbs, Text } from "@mantine/core";

import { CategoryName } from "@jitaspace/ui";

import { CategoryAnchor } from "~/components/Anchor";
import { HoverPrefetchLink } from "~/components/Link";

export type CategoryBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  categoryId?: number;
  categoryName?: string;
};

export const CategoryBreadcrumbs = memo(
  ({ categoryId, categoryName, ...otherProps }: CategoryBreadcrumbsProps) => {
    return (
      <Breadcrumbs {...otherProps}>
        <Anchor component={HoverPrefetchLink} href="/categories">
          <Text>Inventory</Text>
        </Anchor>
        <CategoryAnchor categoryId={categoryId}>
          <CategoryName name={categoryName} />
        </CategoryAnchor>
      </Breadcrumbs>
    );
  },
);
CategoryBreadcrumbs.displayName = "CategoryBreadcrumbs";
