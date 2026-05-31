"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Text } from "@mantine/core";

export type StargateNameProps = TextProps & {
  name?: string;
};

export const StargateName = memo(
  ({ name, ...otherProps }: StargateNameProps) => {
    return <Text {...otherProps}>{name}</Text>;
  },
);
StargateName.displayName = "StargateName";
