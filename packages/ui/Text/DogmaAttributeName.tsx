"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetDogmaAttributesAttributeId } from "@jitaspace/esi-client";





export type DogmaAttributeNameProps = TextProps & {
  attributeId?: number;
};

export const DogmaAttributeName = memo(
  ({ attributeId, ...otherProps }: DogmaAttributeNameProps) => {
    const { data, isLoading } = useGetDogmaAttributesAttributeId(
      attributeId ?? 1,
      {},
      {},
      { query: { enabled: !!attributeId } },
    );
    if (isLoading) {
      const placeholder = "Unknown attribute";
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
    return (
      <Text {...otherProps}>
        {data?.data.display_name ||
          data?.data.name ||
          `Unnamed Attribute ${attributeId}`}
      </Text>
    );
  },
);
DogmaAttributeName.displayName = "DogmaAttributeName";
