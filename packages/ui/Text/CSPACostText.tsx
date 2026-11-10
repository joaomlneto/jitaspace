"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

export type CSPACostTextProps = TextProps & {
  cost?: number | null;
};

/**
 * The ISK CONCORD charges to mail a character with CSPA set, e.g.
 * "250,000 ISK". A fixed locale keeps the server and client renders identical.
 */
export const CSPACostText = memo(
  ({ cost, ...otherProps }: CSPACostTextProps) => {
    if (cost === undefined || cost === null) {
      return (
        <Text {...otherProps}>
          <Skeleton
            component="span"
            style={{ display: "inline-block" }}
            height="1em"
            width="10ch"
          />
        </Text>
      );
    }
    return <Text {...otherProps}>{cost.toLocaleString("en-US")} ISK</Text>;
  },
);
CSPACostText.displayName = "CSPACostText";
