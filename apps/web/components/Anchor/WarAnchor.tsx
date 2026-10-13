"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import type React from "react";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type WarAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    warId?: number | null;
  };

export const WarAnchor = memo(
  ({ warId, children, prefetch, ...otherProps }: WarAnchorProps) => {
    // While the id is nullish the children render unlinked, so the href never
    // reads `/war/undefined` (see CorporationAnchor).
    if (warId === null || warId === undefined) {
      return <Anchor {...otherProps}>{children}</Anchor>;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/war/${warId}`}
        prefetch={prefetch}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
WarAnchor.displayName = "WarAnchor";
