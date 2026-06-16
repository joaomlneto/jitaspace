"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import type React from "react";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type WarAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    warId: number;
  };

export const WarAnchor = memo(
  ({ warId, children, ...otherProps }: WarAnchorProps) => {
    return (
      <Anchor component={Link} href={`/war/${warId}`} {...otherProps}>
        {children}
      </Anchor>
    );
  },
);
WarAnchor.displayName = "WarAnchor";
