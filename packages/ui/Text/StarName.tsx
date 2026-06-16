"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";
import { Text } from "@mantine/core";

export type StarNameProps = TextProps & {
  name?: string;
};

export const StarName = memo(({ name, ...otherProps }: StarNameProps) => {
  return <Text {...otherProps}>{name}</Text>;
});
StarName.displayName = "StarName";
