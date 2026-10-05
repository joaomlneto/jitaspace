"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type TypeListAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    typeListId?: string | number;
  };

export const TypeListAnchor = memo(
  ({ typeListId, children, ...otherProps }: TypeListAnchorProps) => {
    if (typeListId === undefined) {
      return children;
    }

    return (
      <Anchor
        component={Link}
        href={`/type-list/${typeListId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
TypeListAnchor.displayName = "TypeListAnchor";
