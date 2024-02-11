"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseCategoriesCategoryId } from "@jitaspace/esi-client";





export type CategoryNameProps = TextProps & {
  categoryId?: number;
};

export const CategoryName = memo(
  ({ categoryId, ...otherProps }: CategoryNameProps) => {
    const { data, isLoading } = useGetUniverseCategoriesCategoryId(
      categoryId ?? 1,
      {},
      {},
      { query: { enabled: !!categoryId } },
    );
    if (isLoading)
      return (
        <Skeleton>
          <Text {...otherProps}>Unknown Category</Text>
        </Skeleton>
      );
    return <Text {...otherProps}>{data?.data.name}</Text>;
  },
);
CategoryName.displayName = "CategoryName";
