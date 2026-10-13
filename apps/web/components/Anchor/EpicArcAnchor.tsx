"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type EpicArcAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    epicArcId?: string | number;
  };

export const EpicArcAnchor = memo(
  ({ epicArcId, children, ...otherProps }: EpicArcAnchorProps) => {
    if (epicArcId === undefined) {
      return children;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/epic-arc/${epicArcId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
EpicArcAnchor.displayName = "EpicArcAnchor";
