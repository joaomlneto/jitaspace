"use client";

import { memo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";





export type GroupNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    groupId?: string | number;
  };

export const GroupAnchor = memo(
  ({ groupId, children, ...otherProps }: GroupNameAnchorProps) => {
    if (groupId === undefined) {
      return children;
    }

    return (
      <Anchor component={Link} href={`/group/${groupId}`} {...otherProps}>
        {children}
      </Anchor>
    );
  },
);
GroupAnchor.displayName = "GroupNameAnchor";
