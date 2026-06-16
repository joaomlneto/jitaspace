"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useCategory } from "@jitaspace/hooks";
import { CategoryName as UICategoryName } from "@jitaspace/ui";

export type CategoryNameProps = TextProps & {
  categoryId?: number;
};

export const CategoryName = memo(
  ({ categoryId, ...otherProps }: CategoryNameProps) => {
    const { data } = useCategory(categoryId ?? 0);
    return <UICategoryName name={data?.data.name} {...otherProps} />;
  },
);
CategoryName.displayName = "CategoryName";
