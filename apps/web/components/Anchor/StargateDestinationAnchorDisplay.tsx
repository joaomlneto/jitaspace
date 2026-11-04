"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type StargateDestinationAnchorDisplayProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    destinationSystemId?: number;
  };

export const StargateDestinationAnchorDisplay = memo(
  ({
    destinationSystemId,
    children,
    ...otherProps
  }: StargateDestinationAnchorDisplayProps) => {
    return (
      <EveEntityAnchor
        entityId={destinationSystemId}
        category="solar_system"
        {...otherProps}
      >
        {children}
      </EveEntityAnchor>
    );
  },
);
StargateDestinationAnchorDisplay.displayName =
  "StargateDestinationAnchorDisplay";
