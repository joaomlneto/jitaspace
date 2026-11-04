"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type StarNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    starId?: string | number | null;
  };

export const StarAnchor = memo(
  ({ starId, children, prefetch, ...otherProps }: StarNameAnchorProps) => {
    // While the id is nullish the children render unlinked, so the href never
    // reads `/star/undefined` (see CorporationAnchor).
    if (starId === null || starId === undefined) {
      return <Anchor {...otherProps}>{children}</Anchor>;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/star/${starId}`}
        prefetch={prefetch}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
StarAnchor.displayName = "StarAnchor";
