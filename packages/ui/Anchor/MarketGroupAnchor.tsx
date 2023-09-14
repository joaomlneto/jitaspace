import { memo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

export type MarketGroupNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    marketGroupId?: string | number;
  };

export const MarketGroupAnchor = memo(
  ({ marketGroupId, children, ...otherProps }: MarketGroupNameAnchorProps) => {
    if (marketGroupId === undefined) {
      return children;
    }

    return (
      <Anchor
        component={Link}
        href={`/market-group/${marketGroupId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
MarketGroupAnchor.displayName = "MarketGroupNameAnchor";
