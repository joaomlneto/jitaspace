"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type GroupNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    groupId?: string | number | null;
  };

export const GroupAnchor = memo(
  ({ groupId, children, ...otherProps }: GroupNameAnchorProps) => {
    // Nullish, not just undefined: nullable database columns surface as
    // `null`, which would otherwise render "/group/null".
    if (groupId === null || groupId === undefined) {
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
