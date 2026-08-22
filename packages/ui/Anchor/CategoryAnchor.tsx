"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type CategoryNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    categoryId?: string | number | null;
  };

export const CategoryAnchor = memo(
  ({ categoryId, children, ...otherProps }: CategoryNameAnchorProps) => {
    // Nullish, not just undefined: nullable database columns surface as
    // `null`, which would otherwise render "/category/null".
    if (categoryId === null || categoryId === undefined) {
      return children;
    }

    return (
      <Anchor component={Link} href={`/category/${categoryId}`} {...otherProps}>
        {children}
      </Anchor>
    );
  },
);
CategoryAnchor.displayName = "CategoryNameAnchor";
