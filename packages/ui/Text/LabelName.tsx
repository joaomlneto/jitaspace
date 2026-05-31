"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";
import { Text } from "@mantine/core";

export type LabelNameProps = TextProps & {
  name?: string;
};

export const LabelName = memo(({ name, ...otherProps }: LabelNameProps) => {
  return <Text {...otherProps}>{name}</Text>;
});
LabelName.displayName = "LabelName";
