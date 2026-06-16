"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type CorporationNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    corporationId: string | number;
  };

export const CorporationAnchor = memo(
  ({ corporationId, children, ...otherProps }: CorporationNameAnchorProps) => {
    return (
      <Anchor
        component={Link}
        href={`/corporation/${corporationId}/`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
CorporationAnchor.displayName = "CorporationNameAnchor";
