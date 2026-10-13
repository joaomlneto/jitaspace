"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type GroupNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    groupId?: string | number | null;
  };

export const GroupAnchor = memo(
  ({ groupId, children, ...otherProps }: GroupNameAnchorProps) => {
    if (groupId === null || groupId === undefined) {
      return children;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/group/${groupId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
GroupAnchor.displayName = "GroupNameAnchor";
