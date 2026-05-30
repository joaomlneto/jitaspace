"use client";

import { memo } from "react";
import { type TextProps } from "@mantine/core";
import { useDogmaAttribute } from "@jitaspace/hooks";
import { DogmaAttributeName as UIDogmaAttributeName } from "@jitaspace/ui";

export type DogmaAttributeNameProps = TextProps & {
  attributeId?: number;
};

export const DogmaAttributeName = memo(({ attributeId, ...otherProps }: DogmaAttributeNameProps) => {
  const { data } = useDogmaAttribute(attributeId ?? 0);
  return <UIDogmaAttributeName name={data?.data.name} {...otherProps} />;
});
DogmaAttributeName.displayName = "DogmaAttributeName";
