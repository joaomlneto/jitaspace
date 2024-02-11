"use client";

import { memo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";





export type AllianceNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    allianceId: string | number;
  };

export const AllianceAnchor = memo(
  ({ allianceId, children, ...otherProps }: AllianceNameAnchorProps) => {
    return (
      <Anchor component={Link} href={`/alliance/${allianceId}`} {...otherProps}>
        {children}
      </Anchor>
    );
  },
);
AllianceAnchor.displayName = "AllianceNameAnchor";
