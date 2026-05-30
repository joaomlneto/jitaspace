"use client";

import { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type StargateDestinationNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    destinationSystemId?: number;
  };

export const StargateDestinationAnchor = memo(
  ({
    destinationSystemId,
    children,
    ...otherProps
  }: StargateDestinationNameAnchorProps) => {
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
StargateDestinationAnchor.displayName = "StargateDestinationAnchor";
