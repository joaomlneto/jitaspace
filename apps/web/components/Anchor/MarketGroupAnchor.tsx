"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type MarketGroupNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    marketGroupId?: string | number | null;
  };

export const MarketGroupAnchor = memo(
  ({ marketGroupId, children, ...otherProps }: MarketGroupNameAnchorProps) => {
    if (marketGroupId === null || marketGroupId === undefined) {
      return children;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/market-group/${marketGroupId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
MarketGroupAnchor.displayName = "MarketGroupNameAnchor";
