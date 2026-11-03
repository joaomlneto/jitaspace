"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type DogmaAttributeAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    attributeId?: string | number | null;
  };

export const DogmaAttributeAnchor = memo(
  ({
    attributeId,
    children,
    prefetch,
    ...otherProps
  }: DogmaAttributeAnchorProps) => {
    // While the id is nullish the children render unlinked, so the href never
    // reads `/dogma/attribute/undefined` (see CorporationAnchor).
    if (attributeId === null || attributeId === undefined) {
      return <Anchor {...otherProps}>{children}</Anchor>;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/dogma/attribute/${attributeId}`}
        prefetch={prefetch}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
DogmaAttributeAnchor.displayName = "DogmaAttributeAnchor";
