"use client";

import { memo } from "react";
import { Text, type TextProps } from "@mantine/core";

export type CSPACostTextProps = TextProps & {
  cost?: number | null;
};

export const CSPACostText = memo(
  ({ cost, ...otherProps }: CSPACostTextProps) => {
    return <Text {...otherProps}>{cost} ISK</Text>;
  },
);
CSPACostText.displayName = "CSPACostText";
