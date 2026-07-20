"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type ConstellationAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    constellationId?: number | string;
  };

export const ConstellationAnchor = memo(
  ({ constellationId, children, ...props }: ConstellationAnchorProps) => {
    return (
      <EveEntityAnchor
        entityId={constellationId}
        category="constellation"
        {...props}
      >
        {children}
      </EveEntityAnchor>
    );
  },
);
ConstellationAnchor.displayName = "ConstellationAnchor";
