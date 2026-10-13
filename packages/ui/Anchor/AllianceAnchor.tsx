"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "../Link";

export type AllianceNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    allianceId: string | number;
  };

export const AllianceAnchor = memo(
  ({ allianceId, children, ...otherProps }: AllianceNameAnchorProps) => {
    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/alliance/${allianceId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
AllianceAnchor.displayName = "AllianceNameAnchor";
