import React, { memo } from "react";
import Link from "next/link";
import {
  Anchor,
  Breadcrumbs,
  Text,
  type BreadcrumbsProps,
} from "@mantine/core";

import { CategoryAnchor } from "../Anchor";
import { CategoryName } from "../Text";

export type CategoryBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  categoryId?: number;
};

export const CategoryBreadcrumbs = memo(
  ({ categoryId, ...otherProps }: CategoryBreadcrumbsProps) => {
    return (
      <Breadcrumbs {...otherProps}>
        <Anchor component={Link} href="/categories">
          <Text>Inventory</Text>
        </Anchor>
        <CategoryAnchor categoryId={categoryId}>
          <CategoryName categoryId={categoryId} />
        </CategoryAnchor>
      </Breadcrumbs>
    );
  },
);
CategoryBreadcrumbs.displayName = "CategoryBreadcrumbs";
