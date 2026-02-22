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
    if (isLoading) {
      const placeholder = "Unknown Category";
      const skeletonWidth = Math.min(Math.max(placeholder.length, 4), 24);
      return (
        <Text {...otherProps}>
          <Skeleton
            component="span"
            style={{ display: "inline-block" }}
            height="1em"
            width={`${skeletonWidth}ch`}
          />
        </Text>
      );
    }
    return <Text {...otherProps}>{data?.data.name}</Text>;
  },
);
CategoryName.displayName = "CategoryName";
