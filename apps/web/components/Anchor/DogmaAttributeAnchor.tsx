"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type DogmaAttributeAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    attributeId: string | number;
  };

export const DogmaAttributeAnchor = memo(
  ({ attributeId, children, ...otherProps }: DogmaAttributeAnchorProps) => {
    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/dogma/attribute/${attributeId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
DogmaAttributeAnchor.displayName = "DogmaAttributeAnchor";
