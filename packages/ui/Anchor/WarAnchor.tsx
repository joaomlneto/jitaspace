import React, { memo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

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
