"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

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
        component={HoverPrefetchLink}
        href={`/type-list/${typeListId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
TypeListAnchor.displayName = "TypeListAnchor";
