"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type CategoryNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    categoryId?: string | number;
  };

export const CategoryAnchor = memo(
  ({ categoryId, children, ...otherProps }: CategoryNameAnchorProps) => {
    if (categoryId === undefined) {
      return children;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/category/${categoryId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
CategoryAnchor.displayName = "CategoryNameAnchor";
