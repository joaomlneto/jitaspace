"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "../Link";

export type StarNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    starId: string | number;
  };

export const StarAnchor = memo(
  ({ starId, children, ...otherProps }: StarNameAnchorProps) => {
    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/star/${starId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
StarAnchor.displayName = "StarAnchor";
